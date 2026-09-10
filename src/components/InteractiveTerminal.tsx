import React, { useState, useRef, useEffect } from "react";
import { Terminal, Sparkles } from "lucide-react";
import type { TerminalLine } from "@/types";

export default function InteractiveTerminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: "=== RIGALIS SHELL v2.8-BETA ===", type: "system" },
    { text: "Hi, I'm Parth's AI twin! Type 'help' to list matching operations, or type 'ai <question>' to ask me anything about reverse engineering and bin design.", type: "success" },
    { text: "visitor@rigalis.dev:~$ ", type: "input" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to lowest bounds
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Handle command submissions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    // Append input line first
    const newHistory = [...history];
    // Modify the last line to complete the input text
    if (newHistory.length > 0 && newHistory[newHistory.length - 1].text.endsWith("~$ ")) {
      newHistory[newHistory.length - 1].text += cmd;
    } else {
      newHistory.push({ text: `visitor@rigalis.dev:~$ ${cmd}`, type: "input" });
    }

    const commandParts = cmd.split(" ");
    const primaryCmd = commandParts[0].toLowerCase();
    const argument = commandParts.slice(1).join(" ");

    newHistory.push({ text: "", type: "system" }); // Buffer line helper

    switch (primaryCmd) {
      case "help":
        newHistory.push(
          { text: "Core Operations Shell Commands:", type: "success" },
          { text: "  about         - Print brief biography of Parth Patel.", type: "output" },
          { text: "  blog          - List recent draft security writeup topics.", type: "output" },
          { text: "  projects      - List compiler & disassembly tooling links.", type: "output" },
          { text: "  crackme       - Spawn interactive x86 reverse assembly chall.", type: "output" },
          { text: "  solve <val>   - Submit a key solution to the CTF crackme puzzle.", type: "output" },
          { text: "  ai <prompt>   - Question Parth's server-side Gemini model agent twin.", type: "output" },
          { text: "  clear         - Clear terminal stdout history logs.", type: "output" }
        );
        break;

      case "clear":
        setHistory([{ text: "visitor@rigalis.dev:~$ ", type: "input" }]);
        setInputVal("");
        return;

      case "about":
        newHistory.push(
          { text: "BIOGRAPHY: Parth Patel (@rigalis)", type: "success" },
          { text: "  Parth is a security researcher and product engineer based in India with deep interest in compiler design, ELF binary packers, binary disassembly, and beautiful visual systems.", type: "output" },
          { text: "  Favorite tools: Neovim, Ghidra, IDA Pro Pro, GDB, AFL fuzzers.", type: "output" },
          { text: "  Mission: Making security tools look beautiful and functional.", type: "output" }
        );
        break;

      case "blog":
        newHistory.push(
          { text: "Security Writeups List:", type: "success" },
          { text: "  - [heap-overflow-elf-hunting] Hunting Heap Overflows in ELF Binaries", type: "output" },
          { text: "  - [custom-ghidra-theme-design] Reimagining Reverse Engineering UIs", type: "output" },
          { text: "  - [crackme-vm-bytecode] Reversing Bytecode Emulators (Project Sekai)", type: "output" }
        );
        break;

      case "projects":
        newHistory.push(
          { text: "Tools Repository Archive:", type: "success" },
          { text: "  - [GhidPy-Themer] Automated workspace theme generator for Ghidra", type: "output" },
          { text: "  - [SleekStripper] Rust binary footprint & ELF header minimizer", type: "output" },
          { text: "  - [FuzzForge] AFL network daemon testing block wrapper", type: "output" },
          { text: "  - [Bytecode-Sandbox] TypeScript Stack-VM instruction visualizer", type: "output" }
        );
        break;

      case "crackme":
        newHistory.push(
          { text: "=== EMBEDDED DEFENSE CHALLENGE ===", type: "error" },
          { text: "A flag has been locked inside a virtual check loop. Disassemble the following assembly path:", type: "output" },
          { text: "   MOV EAX, [KEY_INPUT]   ; Hint: key is an integer", type: "output" },
          { text: "   XOR EBX, EBX", type: "output" },
          { text: "   ADD EBX, EAX           ; Add key directly", type: "output" },
          { text: "   SHL EBX, 2             ; Shift left by 2 bits (*4)", type: "output" },
          { text: "   SUB EBX, 42            ; Subtract decimal 42", type: "output" },
          { text: "   CMP EBX, 3990          ; Compare accumulator", type: "output" },
          { text: "To unlock the secret key, calculate the input and call: solve <decimal_integer>", type: "success" }
        );
        break;

      case "solve":
        const guess = parseInt(argument);
        if (isNaN(guess)) {
          newHistory.push({ text: "Error: enter a decimal integer e.g., 'solve 250'", type: "error" });
        } else {
          // Mathematical solution:
          // (guess * 4) - 42 = 3990
          // guess * 4 = 4032
          // guess = 1008
          if (guess === 1008) {
            newHistory.push(
              { text: "SUCCESS: flag{x86_c0mp_sh1ft_c0mpl3t3_rigal1s}", type: "success" },
              { text: "You solved Parth's assembly validator! You are officially an elite binary reverser.", type: "success" }
            );
          } else {
            newHistory.push({ text: `DENIED: Calculated accumulator was ${ (guess * 4) - 42 }. Target value was 3990. Try again!`, type: "error" });
          }
        }
        break;

      case "ai":
        if (!argument) {
          newHistory.push({ text: "Error: Please include a question. e.g., 'ai why do you like security?'", type: "error" });
        } else {
          setIsLoading(true);
          try {
            const apiRes = await fetch("/api/terminal/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: argument })
            });
            const data = await apiRes.json();
            if (data.reply) {
              newHistory.push({ text: data.reply, type: "success" });
            } else {
              newHistory.push({ text: "Empty response received from artificial intellect.", type: "error" });
            }
          } catch (err) {
            newHistory.push({ text: "Server Connection Error: Ensure backend secrets and environment router are active.", type: "error" });
          } finally {
            setIsLoading(false);
          }
        }
        break;

      default:
        newHistory.push({ text: `Command not found: '${primaryCmd}'. Type 'help' to review valid operations list.`, type: "error" });
        break;
    }

    newHistory.push({ text: "visitor@rigalis.dev:~$ ", type: "input" });
    setHistory(newHistory);
    setInputVal("");
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-none overflow-hidden shadow-2xl font-mono text-xs max-w-full">
      {/* Console Top Header Bar */}
      <div className="bg-neutral-900 px-4 py-2 flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-yellow-400" />
          <span className="text-neutral-300 font-bold tracking-tight">rigalis-sh-v2.8</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
        </div>
      </div>

      {/* Terminal View Panel */}
      <div 
        ref={scrollRef}
        className="h-80 md:h-96 overflow-y-auto scroller p-4 space-y-2 bg-neutral-950/95 leading-relaxed selection:bg-yellow-400 selection:text-neutral-950"
      >
        {history.map((line, idx) => {
          let styleClass = "text-neutral-300";
          if (line.type === "input") styleClass = "text-yellow-400 font-bold";
          else if (line.type === "error") styleClass = "text-red-400 font-bold border-l-2 border-red-500 pl-2 bg-red-950/10 py-0.5";
          else if (line.type === "system") styleClass = "text-neutral-500 font-semibold border-b border-neutral-900 pb-1";
          else if (line.type === "success") styleClass = "text-emerald-400 font-medium pl-1 bg-emerald-950/5 py-0.5";

          return (
            <div key={idx} className={styleClass}>
              {line.text}
            </div>
          );
        })}

        {isLoading && (
          <div className="text-emerald-400 font-bold flex items-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-yellow-400" />
            <span>AI double is disassembling vector thoughts...</span>
          </div>
        )}
      </div>

      {/* Direct Interactive Console Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-neutral-800 bg-neutral-950 flex items-center px-4 py-2">
        <span className="text-yellow-400 font-bold mr-2 select-none">visitor@rigalis.dev:~$</span>
        <input
          type="text"
          id="terminal-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent text-neutral-200 outline-none border-none font-mono py-1 font-semibold caret-yellow-400 focus:ring-0 focus:border-neutral-800"
          placeholder="Type 'help' to unlock binary CTF challenge..."
          autoComplete="off"
          autoFocus
        />
      </form>
    </div>
  );
}
