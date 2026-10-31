"""Cuts every track in assets/music/{city,town,route}/ down to one seamless loop.

Game rips play the loop twice and then fade out. This finds the loop length
(where the song best repeats itself) and where the loop starts (end of the
intro), cuts exactly one pass, blends the first few ms so the wrap is
click-free, and re-encodes it. The player loops the file, so playback is
endless with no fade.

Originals are kept in assets/music/_originals/ (git-ignored, skipped by
gen-music.js); re-running always starts from those.
Run: python scripts/loop-music.py [--ffmpeg PATH] [--dry-run]   (needs numpy, ffmpeg)
"""
import argparse
import os
import shutil
import subprocess
import sys

import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
MUSIC = os.path.join(ROOT, 'assets', 'music')
ORIGINALS = os.path.join(MUSIC, '_originals')
KINDS = ['city', 'town', 'route']

SR = 44100          # sample rate for cutting
ASR = 11025         # analysis rate (SR / 4)
MIN_LOOP_S = 8      # shortest loop considered
BLEND_S = 0.015     # seam blend length
MIN_MATCH = 0.9     # share of the loop whose loudness contour must repeat


def decode(ffmpeg, path, sr, channels):
    raw = subprocess.run(
        [ffmpeg, '-v', 'error', '-i', path, '-f', 's16le', '-ac', str(channels), '-ar', str(sr), '-'],
        check=True, capture_output=True,
    ).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    return x.reshape(-1, channels)


def window_match(x, lag, win):
    """Correlation of each win-long window of x with the window one lag later."""
    n = (len(x) - lag) // win
    if n <= 0:
        return np.zeros(0)
    a = x[: n * win].reshape(n, win)
    b = x[lag : lag + n * win].reshape(n, win)
    num = (a * b).sum(axis=1)
    den = np.sqrt((a * a).sum(axis=1) * (b * b).sum(axis=1)) + 1e-9
    m = num / den
    m[(a * a).sum(axis=1) < 1e-6] = 0  # silence proves nothing
    return m


def sliding_match(x, lag, width, hop):
    """window_match with width-long windows starting every hop samples."""
    n = (len(x) - lag - width) // hop + 1
    if n <= 0:
        return np.zeros(0)
    idx = np.arange(n)[:, None] * hop + np.arange(width)
    a, b = x[idx], x[idx + lag]
    den = np.sqrt((a * a).sum(axis=1) * (b * b).sum(axis=1)) + 1e-9
    return (a * b).sum(axis=1) / den


def envelope(x, step):
    """RMS loudness every `step` samples."""
    n = len(x) // step
    return np.sqrt((x[: n * step].reshape(n, step) ** 2).mean(axis=1))


def find_loop(stereo):
    mono = stereo.mean(axis=1)
    small = mono[:: SR // ASR] - mono.mean()
    n = len(small)
    # Waveform autocorrelation for every lag: the loop length is a sharp peak.
    size = 1 << (2 * n - 1).bit_length()
    spec = np.fft.rfft(small, size)
    ac = np.fft.irfft(spec * np.conj(spec), size)[:n]
    energy = np.cumsum(small[::-1] ** 2)[::-1]  # energy of x[lag:]
    r = ac / (np.sqrt(energy * energy[0]) + 1e-9)
    lo, hi = int(MIN_LOOP_S * ASR), int(n * 0.62)
    if hi <= lo:
        return None
    seg = r[lo:hi]
    peaks = np.nonzero((seg[1:-1] > seg[:-2]) & (seg[1:-1] >= seg[2:]))[0] + 1
    lags = [lo + int(p) for p in peaks[np.argsort(-seg[peaks])][:6]]

    win = ASR // 4  # quarter-second windows
    step = ASR // 40  # 25 ms loudness frames
    env = envelope(small, step)
    for lag in lags:
        # The true length can fall between analysis samples: take the best neighbour.
        wm = np.max([window_match(small, lag + d, win) for d in (-1, 0, 1)], axis=0)
        em = sliding_match(env - env.mean(), round(lag / step), 40, 10)  # 1 s windows, 1/4 s apart
        body = lag // win
        # The loudness contour must repeat from the loop start up to where the
        # second pass fades out (the waveform itself only repeats where there is
        # no GBA noise percussion, whose hiss differs on every pass).
        good = em > 0.75
        run = np.convolve(good, np.ones(8), mode='valid') == 8
        if not run.any():
            continue
        first = int(np.argmax(run))
        last = len(run) - 1 - int(np.argmax(run[::-1])) + 8  # end of the repeating stretch
        # Seam: the first window there where the waveform repeats almost exactly,
        # so the cut never lands on a drum hit. Keeping seam <= last keeps the
        # cut piece [seam, seam + loop) clear of the fade-out.
        clean = np.nonzero(wm[first:last] > 0.97)[0]
        if len(clean) == 0:
            continue
        seam = first + int(clean[0])
        span = good[seam : min(seam + body, last)]
        if len(span) < 0.6 * body:
            continue
        quality = float(np.mean(span))
        if quality >= MIN_MATCH:
            return refine(mono, seam * win * (SR // ASR), lag * (SR // ASR), quality)
    return None


def refine(mono, S, L, quality):
    """Exact loop length at the full rate, and a seam on a rising zero crossing."""
    N, search = SR // 4, 8 * (SR // ASR)
    ref = mono[S : S + N]
    seg = mono[S + L - search : S + L + search + N]
    if len(ref) < N or len(seg) < 2 * search + N:
        return None
    corr = np.correlate(seg, ref, mode='valid')
    norms = np.sqrt(np.convolve(seg**2, np.ones(N), mode='valid') * (ref**2).sum()) + 1e-9
    L = L - search + int(np.argmax(corr / norms))
    zc = np.nonzero((mono[S : S + 2000 - 1] <= 0) & (mono[S + 1 : S + 2000] > 0))[0]
    if len(zc):
        S += int(zc[0]) + 1
    return S, L, quality


def cut(stereo, S, L):
    out = stereo[S : S + L].copy()
    n = int(BLEND_S * SR)
    w = np.linspace(0, 1, n)[:, None]
    # Make the start continue from the end: what follows S+L is ~S again.
    out[:n] = stereo[S + L : S + L + n] * (1 - w) + stereo[S : S + n] * w
    return out


def encode(ffmpeg, pcm, path):
    data = (np.clip(pcm, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(
        [ffmpeg, '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
         '-c:a', 'libmp3lame', '-b:a', '256k', '-write_xing', '1', path],
        input=data, check=True,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ffmpeg', default='ffmpeg')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    failed = []
    for kind in KINDS:
        src_dir, orig_dir = os.path.join(MUSIC, kind), os.path.join(ORIGINALS, kind)
        os.makedirs(orig_dir, exist_ok=True)
        for name in sorted(os.listdir(src_dir)):
            if not name.lower().endswith('.mp3'):
                continue
            orig = os.path.join(orig_dir, name)
            if not os.path.exists(orig):
                shutil.copy2(os.path.join(src_dir, name), orig)
            stereo = decode(args.ffmpeg, orig, SR, 2)
            found = find_loop(stereo)
            label = f'{kind}/{name}'
            if not found or found[2] < MIN_MATCH:
                q = f' (only {found[2]:.0%} repeats)' if found else ''
                print(f'SKIP {label}: no reliable loop{q}; left as is')
                failed.append(label)
                continue
            S, L, q = found
            print(f'OK   {label}: intro {S / SR:5.2f} s, loop {L / SR:6.2f} s, repeats {q:.0%}'
                  f'  ({len(stereo) / SR:.0f} s -> {L / SR:.0f} s)')
            if not args.dry_run:
                encode(args.ffmpeg, cut(stereo, S, L), os.path.join(src_dir, name))
    if failed:
        print('Not looped:', ', '.join(failed))
    return 0


if __name__ == '__main__':
    sys.exit(main())
