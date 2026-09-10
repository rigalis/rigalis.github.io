import { useEffect, useRef } from "react";

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const assemblyOpcodes = [
      "MOV EAX, 0x539",
      "XOR EBX, EBX",
      "ADD EBX, EAX",
      "SHL EBX, 2",
      "SUB EBX, 0x2A",
      "CMP EBX, 0x5D8",
      "JE 0x4002fa",
      "PUSH EBP",
      "MOV EBP, ESP",
      "POP EBP",
      "RET",
      "INT 0x80",
      "CALL exit",
      "LEA RDI, [RIP+MSG]",
      "SYSCALL",
      "NOP",
      "PUSH RAX",
      "POP RBX"
    ];

    const streams: { x: number; y: number; speed: number; chars: string[]; alpha: number }[] = [];
    const streamCount = Math.floor(width / 130) + 4;

    for (let i = 0; i < streamCount; i++) {
      streams.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: 0.5 + Math.random() * 0.8,
        chars: Array.from({ length: 4 + Math.floor(Math.random() * 5) }, () => 
          assemblyOpcodes[Math.floor(Math.random() * assemblyOpcodes.length)]
        ),
        alpha: 0.08 + Math.random() * 0.12
      });
    }

    const draw = () => {
      // Gruvbox-adaptive background
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.fillStyle = isLight ? "rgba(251, 241, 199, 1)" : "rgba(40, 40, 40, 1)";
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal retro scanline grids
      ctx.strokeStyle = isLight ? "rgba(213, 196, 161, 0.35)" : "rgba(60, 56, 54, 0.5)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.font = "10px JetBrains Mono, monospace";

      streams.forEach((s) => {
        // gruvbox yellow #fabd2f / light #b57614
        const rgb = isLight ? `107, 102, 14` : `250, 189, 47`;
        ctx.fillStyle = `rgba(${rgb}, ${s.alpha + 0.15})`;
        let py = s.y;
        s.chars.forEach((char) => {
          ctx.fillText(char, s.x, py);
          py += 16;
        });

        s.y += s.speed;
        if (s.y > height) {
          s.y = -80;
          s.x = Math.random() * width;
          s.speed = 0.5 + Math.random() * 0.8;
          s.chars = Array.from({ length: 4 + Math.floor(Math.random() * 5) }, () => 
            assemblyOpcodes[Math.floor(Math.random() * assemblyOpcodes.length)]
          );
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvas.width = canvasRef.current.offsetWidth;
      height = canvas.height = canvasRef.current.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none opacity-40" 
      id="hero-canvas-animation"
    />
  );
}
