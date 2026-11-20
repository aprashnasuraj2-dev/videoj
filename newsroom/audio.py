"""Original procedural audio texture; external voice audio is mandatory."""
from __future__ import annotations
import math
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt


def build_bed(path: Path, duration: float, *, rate=32000, seed=211, mood="tense"):
    """Original calm/tense sonic texture, with scene transitions handled in the mix."""
    if duration <= 0: raise ValueError("duration must be positive")
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    t = np.arange(int(math.ceil(duration*rate)), dtype=np.float64)/rate
    # Low synth drone below narration fundamentals and upper harmonics.
    freqs = (61.735, 92.499, 123.471) if mood == 'tense' else (65.406, 98.0, 130.812)
    bed = np.zeros_like(t)
    for k, f in enumerate(freqs):
        env = 0.72 + 0.17 * np.sin(2*np.pi*t/(11.0+k*4.0)+k)
        bed += np.sin(2*np.pi*f*t+0.03*np.sin(t*.3+k)) * env * (0.5/(k+1))
    # Small original sound-design pulses at evenly spaced intervals.
    noise = rng.standard_normal(len(t))
    sos = butter(2, 220, fs=rate, output='sos')
    filtered = sosfilt(sos,noise)
    filtered = filtered / max(1e-8,np.max(np.abs(filtered)))
    for center in np.arange(4.5, duration - 1, 7.5):
        fade = np.exp(-((t-center)/0.5)**2)
        bed += 0.18 * fade * filtered
    # Stereo width without expensive convolution, explicitly non-copyrighted.
    left=bed
    right=np.roll(bed, round(rate*0.003))
    sig=np.stack([left,right], axis=1).astype('float32')
    # Optional studio effects, no hard dependency when portability matters.
    try:
        from pedalboard import Pedalboard, Compressor, HighpassFilter, Reverb
        fx=Pedalboard([HighpassFilter(cutoff_frequency_hz=32),Compressor(threshold_db=-18,ratio=1.5),Reverb(room_size=.35,wet_level=.09,dry_level=.90)])
        sig=fx(sig.T,rate).T.astype('float32')
    except ImportError:
        pass
    # Keep bed quiet; final mix -22dB relative to the VO and loudnorm.
    sig*=0.11/max(1e-7,np.max(np.abs(sig)))
    edge=min(int(rate*.75),len(sig)//3)
    if edge>0:
        sig[:edge] *= np.linspace(0,1,edge)[:,None]
        sig[-edge:] *= np.linspace(1,0,edge)[:,None]
    sf.write(str(path),sig,rate,subtype='PCM_16')
    return path