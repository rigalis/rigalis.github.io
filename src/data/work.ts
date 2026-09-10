import type { Project } from "@/types";

export const projects: Project[] = [
  {
    id: "ghidpy-themer",
    title: "GhidPy-Themer",
    description: "Multi-platform theme builder & workspace customizer for Ghidra. Generate eye-safe modern UI stylesheets.",
    longDescription: "A specialized compiler utility written in Python that generates and injects modern visual themes (such as Solarized, OneDark, and Nord Slate) directly into Ghidra's Swing runtime engine. Features include a color palette analyzer, automatically generated disassembler highlight sheets, and direct configuration patching. Now used by thousands of CTF players worldwide.",
    tags: ["Python", "Ghidra", "Swing-UI", "Color-Theory", "Design-Systems"],
    category: "Design Systems",
    githubUrl: "https://github.com/rigalis/ghidpy-themer",
    featured: true
  },
  {
    id: "elf-stripper-compiler",
    title: "SleekStripper",
    description: "An ELF header reconstruction tool to minimize application footprints and obfuscate debugging tables.",
    longDescription: "An advanced compiler-adjacent tool written in Rust designed to parse ELF section tables, strip debugging symbols, securely overwrite section header lists, rewrite entry points to non-standard locations, and pack segments. Ideal for lightweight binary packaging in microcontrollers, kernel modules, or custom security CTF challenge deployments.",
    tags: ["Rust", "C", "ELF-Spec", "Linker-Scripter", "Compilers"],
    category: "Security Tools",
    githubUrl: "https://github.com/rigalis/sleek-stripper",
    featured: true
  },
  {
    id: "fuzzforge",
    title: "FuzzForge",
    description: "Smart binary harnesser and fuzzer targeting x86 network deamons with radamsa-inspired mutations.",
    longDescription: "FuzzForge is an educational binary instrumentation harness and fuzzer. It operates by spawning target daemon processes, attaching light trace hooks, injecting mutated buffers (utilizing custom byte flip-flop algorithms), and recording crash offsets. Features a beautiful curses-style command line reporting engine to track speed, unique crashes, and basic basic-block block coverage.",
    tags: ["C++", "pwn", "AFL", "Instrumentation", "POSIX"],
    category: "Security Tools",
    featured: false
  },
  {
    id: "vm-crackset",
    title: "Bytecode-Keygen-Sandbox",
    description: "An educational interactive CTF puzzle implementing specialized virtual stack machine emulators.",
    longDescription: "A fully custom 8-bit virtual machine sandbox built in TypeScript, complete with custom bytecode compilers, interpreters, and dynamic execution graphs. Designed to provide security students with hands-on debugging challenges where they learn to write keygens, reverse interpreter layouts, and map binary mathematical expressions.",
    tags: ["TypeScript", "Compilers", "VM-emulator", "CTF-Forge", "WebAssembly"],
    category: "Exploits / PoCs",
    githubUrl: "https://github.com/rigalis/vm-crackme",
    demoUrl: "#terminal",
    featured: true
  }
];
