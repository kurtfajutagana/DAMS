// Web Audio API synthesizer for clinical reception & operatory arrival alerts
// Generates a soothing dual-tone chime (D5 -> A5) without requiring external audio files

export function playArrivalChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Tone 1: 587.33 Hz (D5 note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Tone 2: 880 Hz (A5 note) - 150ms delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (err) {
    console.warn("Could not play arrival chime:", err);
  }
}
