import * as React from "react";

const BAR_COUNT = 40;

export function useAudioAnalyser(stream: MediaStream | null, active: boolean) {
  const [levels, setLevels] = React.useState<number[]>(() => Array(BAR_COUNT).fill(0.12));

  React.useEffect(() => {
    if (!stream || !active) {
      setLevels(Array(BAR_COUNT).fill(0.12));
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let ctx: AudioContext | null = null;
    let raf = 0;

    try {
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          const norm = sum / step / 255;
          next.push(Math.min(1, Math.max(0.1, norm * 2.2)));
        }
        setLevels(next);
        raf = requestAnimationFrame(tick);
      };
      void ctx.resume();
      tick();
    } catch {
      // AudioContext may fail on some mobile browsers — keep static bars
    }

    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [stream, active]);

  return levels;
}

export { BAR_COUNT as WAVEFORM_BAR_COUNT };
