import type { BlogPost } from "@/types";

export const blogPosts: BlogPost[] = [
  {
    id: "heap-overflow-elf-hunting",
    title: "Deep Dive: Hunting Heap Overflows in ELF Binaries",
    description: "An in-depth analysis of glibc allocator dynamics, heap chunk structures, and exploiting classic double-free & heap corruption — demo showcases enscribe-style left progress index, right marginalia, callouts, figures, tables, footnotes.",
    date: "May 18, 2026",
    readTime: "18 min read",
    category: "Binary Analysis",
    tags: ["heap-exploitation", "glibc", "pwn", "elf", "linux", "demo"],
    content: `
### Introduction to Heap Dynamics
Unlike stack-based buffer overflows, heap-based vulnerabilities reside in the dynamically allocated memory region managed by standard allocators (such as glibc's \`ptmalloc\`). Understanding heap layout and chunks is paramount to auditing binary files for memory corruption bugs.

### The Anatomy of a Heap Chunk
In 64-bit systems, every allocated heap block is aligned to a 16-byte boundary and represented by a chunk structure consisting of:
- **Previous Size**: If the contiguous physical chunk before this block is free, this field contains its size.
- **Size**: Current chunk size, aligned. The lowest 3 bits represent flags:
  - \`A\` (0x4): NON_MAIN_ARENA (allocated from a non-main allocator region)
  - \`M\` (0x2): IS_MMAPPED (block allocated directly via mmap)
  - \`P\` (0x1): PREV_INUSE (1 if previous contiguous chunk is allocated, 0 if free)

\`\`\`c
/* Schematic Representation of an Allocated Chunk */
+-----------------------------+-----------------------------+
|      Previous Chunk Size    |      Current Chunk size |AMP|
+-----------------------------+-----------------------------+
|                          User Data Area                   |
|                      (Returns to malloc call)             |
+-----------------------------------------------------------+
\`\`\`

### The Double-Free Vulnerability
When a chunk is freed twice without re-allocating or cleaning pointer references, the allocator's bin tables (such as smallbins, fastbins, or tcache) can form circular lists or double references to identical slots.

#### Example C Code Vulnerability
\`\`\`c
#include <stdio.h>
#include <stdlib.h>

int main() {
    void *p1 = malloc(64);
    void *p2 = malloc(64);

    free(p1);
    free(p2);
    free(p1); // Vulnerable double free!

    void *p3 = malloc(64); // Allocates p1 again
    void *p4 = malloc(64); // Allocates p2
    void *p5 = malloc(64); // Allocates p1 AGAIN (Overlaps p3 memory space!)
}
\`\`\`

### Remediating the Vuln
To remediate these issues:
1. Always nullify pointers immediately after releasing: \`free(ptr); ptr = NULL;\`.
2. Upgrade compilers with \`-D_FORTIFY_SOURCE=2\` or enable address space checking mechanisms.
3. Leverage modern compiler toolchains that validate allocation integrity automatically.

In the next blog post, we will explore automatic exploit script generators in Python utilizing the dynamic \`pwntools\` API.
`
  },
  {
    id: "custom-ghidra-theme-design",
    title: "Design Exploration: Reimagining Reverse Engineering UIs",
    description: "Designing dark themes and clean custom workspace variables for Ghidra & IDA Pro to achieve high visual hierarchy and reduce cognitive overload.",
    date: "April 12, 2026",
    readTime: "5 min read",
    category: "Design",
    tags: ["ui-ux", "ghidra", "theme-builder", "color-theory", "mononoki"],
    content: `
### The State of Reverse Engineering Tools
Most elite disassemblers (Ghidra, IDA, Cutter) are built by and for engineers who focus majorly on functionality rather than design. Consequently, default interfaces suffer from poor contrast ranges, cognitive-heavy color codings, cluttered dock panels, and sharp default fonts that cause eye pressure over long CTFs.

### Color Psychology in Disassembly
When gazing at a control flow graph (CFG) for 14 hours continuously, the saturation of colored nodes plays a giant role in mental alertness:
- **Red Nodes (Bad Blocks / Jump Targets)**: Should not be pure, vibrant crimson. Pure crimson causes intense retina wear. Choose a muted crimson/rose (\`#e06c75\` or similar) to flag code exits without screaming.
- **Green Nodes (True Branch Nodes)**: Pastel-soft emeralds (\`#98c379\`) sit nicely under dark gray backdrops.
- **Backgrounds**: Say no to default jet-black. True black (\`#000000\`) causes a strong glow contrast between text and background, leading to halos. Introduce soft slate-grays (\`#1e1e24\`, \`#282c34\`) to disperse display lighting.

### Custom CSS Layout Injector
You can style custom workspace rules inside Ghidra's Swing runtime by feeding dynamic HTML properties into standard elements. Here's how we mapped visual palettes onto the GUI:

\`\`\`css
/* Custom Code Fragment for Ghidra FlatDark */
GhidraTextPane {
    background-color: #1e1e1e;
    foreground-color: #abb2bf;
    line-number-color: #5c6370;
}

DecompilerText {
    keyword-color: #c678dd; /* Soft Purple */
    register-color: #e5c07b; /* Warm Yellow */
    comment-color: #5c6370; /* Slate Muted */
}
\`\`\`

### Achieving Minimalist Brutalism
By taking layout elements from sites like **enscribe.dev**, we can construct a unified disassembler UI that fits nicely with a modern terminal editor workflow (Neovim + TMUX). Keep headers ultra-flat, hide borders completely, and rely on subtle 1px divider lines for panels.
`
  },
  {
    id: "crackme-vm-bytecode",
    title: "CTF Writeup: CrackMe VM - Reversing Bytecode Emulators",
    description: "Breaking down a custom 8-bit virtual machine program in an architectural challenge using custom Python disassembly engines and Z3 solvers.",
    date: "March 05, 2026",
    readTime: "10 min read",
    category: "Reverse Engineering",
    tags: ["ctf", "writeup", "virtual-machine", "python", "z3-solver"],
    content: `
### Challenge Overview
During the last Project Sekai CTF, we encountered a binary called \`VM_Keygen\`. It doesn't use standard x86 instruction sets to validate keys; instead, it compiles a virtual stack machine inside its main data section and loops over customized instructions.

### Deconstructing the Interpreter
By examining the program entrypoint in Ghidra, we located the VM dispatcher lookups. The interpreter utilizes an infinite while loop containing a giant switch statement with 8 valid opcodes:

- \`0x10\`: PUSH immediate 16-bit register
- \`0x20\`: POP target register
- \`0x30\`: ADD top two integers on stack
- \`0x40\`: XOR stack[top] with stack[top-1]
- \`0x50\`: ROT (Rotate data circular)
- \`0x60\`: READ_INPUT (Fetch key buffer index)
- \`0x70\`: JE_BOUND (Jump relative if flag set)
- \`0x80\`: VALIDATE_EXIT (Halts program and print success/error)

### Writing a Disassembler in Python
To map the bytecode data section without manual tracking, we wrote a short python parser to translate hexadecimal blocks into descriptive virtual codes:

\`\`\`python
# Disassembly Script excerpt
def disassemble(binary_data):
    pc = 0
    instructions = []
    while pc < len(binary_data):
        opcode = binary_data[pc]
        if opcode == 0x10:
            val = int.from_bytes(binary_data[pc+1:pc+3], "little")
            instructions.append(f"PUSH {hex(val)}")
            pc += 3
        elif opcode == 0x30:
            instructions.append("ADD")
            pc += 1
        elif opcode == 0x60:
            instructions.append("READ_INPUT")
            pc += 1
        # ... Other opcode parsers
    return instructions
\`\`\`

### Automating Keygen with Z3
Once decoded, we extracted the logic formulas: every letter of the input key was multiplied by a Fibonacci index, XORed with a constant array, and compared dynamically. Rather than reversing the algebra manually, we mapped the equations directly in \`Z3 Theorem Prover\`:

\`\`\`python
from z3 import *

solver = Solver()
key = [BitVec(f'k_{i}', 8) for i in range(16)]

for k in key:
    solver.add(k >= 32, k <= 126) # Readable ASCII check

# Feed operations translated from disasm:
solver.add(key[0] ^ 0x5a == 0x3d)
solver.add((key[1] * 3) ^ key[0] == 0xa4)
# ... etc

if solver.check() == sat:
    m = solver.model()
    solved_key = "".join([chr(m[k].as_long()) for k in key])
    print(f"Secret Flag found: {solved_key}")
\`\`\`

This automatically cracked the bytecode program in 45 milliseconds!
`
  }
];
