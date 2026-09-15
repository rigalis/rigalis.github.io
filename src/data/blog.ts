import type { BlogPost } from "@/types";

export const blogPosts: BlogPost[] = [
  {
    id: "z0d1ak-hadopelagic-vmception",
    title: "Shaders, a Signing Block, and a Self-Modifying VM [z0d1ak CTF]",
    description: "Finding a 32-byte bearing hidden behind shader math and debugger traps, then cracking a self-modifying license VM by hand.",
    date: "Sep 14, 2026",
    readTime: "14 min read",
    category: "CTF Writeups",
    tags: ["hadopelagic", "vmception", "reverse-engineering", "ctf", "android", "spirv", "z0d1ak"],
    image: "/images/cam-1.png",
    content: `Got into z0d1ak CTF with THEM?! and idktheflag, really fun rev, even better theme, here are my solves for Hadopelagic & VMception.

---

## Part 1: Hadopelagic

> "Two currents share one trench. One charts the reef; the other listens below the light."

This was one of the more interesting rev challenges.

End state, for anyone who wants the punchline before the plot:

\`\`\`text
bearing: ce3b4a41ecc4aec9e2216145af5630072da19dfbe3b0488cfbfc20d816f3016c
flag:    zdk{bELOw_the_THerMOClIn3_two_SHADER_CURrENts_ConVERgE}
\`\`\`

### First look

This was a personalized challenge, everyone got their own APK, and the job was to find your own 32-byte "bearing." Unzip it and you get:

\`\`\`text
AndroidManifest.xml
resources.arsc
classes.dex
assets/reef.glsl
assets/trench.spv
lib/x86_64/libhadopelagic.so
META-INF/HADAL.SF
META-INF/HADAL.RSA
META-INF/MANIFEST.MF
\`\`\`

The flavor text lines up nicely with what's actually in there: two "currents," a GLSL vertex shader and a SPIR-V Vulkan compute shader, held together by a native lib, with a signing block that turns out to matter a lot more than usual.

Cracked open the DEX with jadx and found the entry point:

\`\`\`java
// ctf.hadopelagic.MainActivity
private static native byte[] nativeProbe(
  String sourceDir, String bearingHex,
  byte[] reefGlsl, byte[] trenchSpv,
  byte[] e16, byte[] certSha256);
\`\`\`

So: 64-hex-char bearing, APK path, both shaders, a mystery 16-byte array, and the signing cert's SHA-256 in; 115 bytes out. Java slices that into \`key[32] || nonce[12] || ciphertext[71]\` and tries a ChaCha20-Poly1305 decrypt. Get the bearing wrong and the Poly1305 tag just fails, no hints, no partial credit. The whole challenge is finding the one bearing that makes the key come out right.

The static array turned out to be:

\`\`\`java
e = {-111,-25,106,47,-60,3,-67,88,125,18,-24,-87,69,54,-53,112}
// = 91 e7 6a 2f c4 03 bd 58 7d 12 e8 a9 45 36 cb 70
\`\`\`

### The two currents, up close

\`reef.glsl\` sets a flat \`uvec4\` output per vertex ID, 16 vertices deep:

\`\`\`glsl
#version 300 es
precision highp int;
flat out uvec4 reefWords;
void main() {
    if (gl_VertexID == 0) reefWords = uvec4(0x54acade1u, 0x6807f876u, ...);
    ...
    if (gl_VertexID == 15) reefWords = uvec4(0x36bc20b8u, ...);
}
\`\`\`

16 × uvec4 comes out to 64 words, 256 bytes of lookup table. Called this \`R[64]\`.

\`trench.spv\` disassembles, via \`spirv-dis\`, into something that chews on a 64-word uniform buffer across 8 rounds and rewrites the first 8 words:

\`\`\`text
w0' = rotl((w0^s41) + (w11^0x6D2B79F5),5) ^ rotl(w13+s43,7)
w1' = rotl((w1^s42) + (w18^0xDA56F3EA),9) ^ rotl(w26+s44,11)
...
\`\`\`

Initially I assumed the SpecId numbers in the decoration list were basically array indices into some spec constant table, wired that up, ran it, and got values that didn't match anything. After checking ARX math, I reread how SPIR-V spec constants work. They use result ID, not SpecId, as index. Each one is tied to a *result ID*, and the SpecId is attached separately through its own decoration instruction:

\`\`\`text
OpDecorate %34 SpecId 41
OpDecorate %60 SpecId 42
OpDecorate %49 SpecId 43
OpDecorate %75 SpecId 44
OpDecorate %100 SpecId 45
\`\`\`

Once I parsed the decorations first and built a proper result ID to spec value map, everything clicked into place. I had actually pasted the SPIR-V disassembly into an AI chat and asked why my SpecId lookup was off - it pointed out that SpecId is a decoration on the result ID, not an array index, which saved me another hour of staring at the spec. Wasted an evening on that, but it's the kind of mistake you only make once.

### Trying to just read the native lib, and giving up on that plan

\`libhadopelagic.so\` is stripped x86_64, built with NDK r27b, linking against \`libandroid.so\`, \`libEGL.so\`, \`libGLESv3.so\`, \`libvulkan.so\`, plus the usual libc/libm/libdl. I started hand-decompiling \`nativeProbe\` in a disassembler. After ~1KB of ~3KB of stripped code, with the GLES and Vulkan setup still untouched, I gave up on reading it.

Switched to dynamic execution: run it natively and observe.

Blocking issues:

1. Android's libc exports symbol versions (\`LIBC\`, \`LIBC_Q\`) that glibc has never heard of. First attempt to just \`dlopen\` the library failed immediately on a missing version node.
2. No EGL, no GLESv3, no Vulkan, no Android runtime anywhere on my system.
3. No JVM, so no JNI environment for a function that expects to be called from one.
4. There's no actual GPU work being verified here anyway, the shaders are just being used as opaque math boxes.

Fixed iteratively:

- Patched the ELF's \`.gnu.version\` section to mark every symbol as global and zeroed \`DT_VERNEEDNUM\`, so the dynamic linker stops looking for version tags that don't exist on my system. First attempt only patched part of the version table and the linker still choked on one symbol, so I redid it exhaustively.
- Wrote a stub \`libc.so\` exporting just the handful of missing symbols the binary actually calls (\`__errno\`, \`__sF\`, \`__assert2\`, \`android_set_abort_message\`, \`android_get_device_api_level\`). Missed \`android_get_device_api_level\` on the first pass and got an instant crash at load time.
- Wrote stub EGL/GLES that parses the \`uvec4(...)\` lines straight out of the shader source and evaluates them on CPU. No GPU required, none wanted. Drafted the initial stub with AI - prompted it to generate a minimal EGL/GLES shim that just parses the shader source, then hand-edited the parsing regex to handle the uvec4 formatting.
- Wrote a small SPIR-V interpreter, not general purpose, just the opcodes this one shader actually uses.
- Wrote a C harness with a fake 300-entry JNIEnv table and fake jstring/jbyteArray objects, then jumped straight to \`nativeProbe\` from \`JNI_OnLoad+0xb0\`. First version of the JNIEnv table had a few function slots missing, which segfaulted the moment \`nativeProbe\` tried to call something like \`NewByteArray\`. Filled in the rest of the table and it started running clean.

Once running, all buffers and constants were visible in logs.

### What the harness told me

For any bearing, \`nativeProbe\` hands back \`key[32] || nonce[12] || ct[71]\`. A few differential runs, same everything except the bearing, made the shape of the problem obvious:

- \`nonce\` and \`ct\` never change. They're sitting in the APK's signing block at offset \`0x49044\`, static across bearings.
- Only \`key\` moves when the bearing moves.
- The spec constants are also bearing-independent:

\`\`\`text
s41=026c2a46 s42=ef568048 s43=1b9bebf3 s44=c4c2e6e4 s45=c3fa5451
\`\`\`

- The Vulkan buffer starts out pre-loaded with the 64 reef words.
- After the compute dispatch, exactly 8 words change. Called this the "wake," \`T\`.

Hand-verified round 1 to make sure my interpreter wasn't lying to me, and got:

\`\`\`text
T = 67a79866 3d335082 f5a9f31f b78cc296
    96369a34 06a7651d f2c433ee 535e127f
\`\`\`

Matched.

### The actual key derivation

Digging into the tail end of \`nativeProbe\` turned up two layers stacked together: a custom 96-round ARX mixer (named \`cdfc0\` after its address, naming things properly takes too long mid-CTF) that transforms the bearing \`B\` into \`X = F(B)\`, and then a hash over everything:

\`\`\`text
"hadopelagic/key/v3\\0" || B || X || T || SP || cert || e16 || status
\`\`\`

SHA-256 didn't match. Checked constants and found the IV word \`0x6b08e647\`, which is distinctly BLAKE2s. I pasted the constants into AI - it suggested BLAKE2s. Sigma table and rotations (16/12/8/7) confirmed it.

The mixer itself, per round:

\`\`\`text
for i in 0..95:
    ebp = golden*(i+1) ^ wake[m1] ^ SP[(3i)&7] ^ e16[i&3]
    ebp = rol(ebp, amt1)
    ebp = (ebp + W[i&7]) ^ W[(5i+3)&7]
    ebp = rol(ebp, amt2)
    W[i&7] = ebp
    ebp = (ebp + W[(i+2)&7])
    ebp = rol(ebp, amt3)
    W[(i&7)^4] ^= ebp
    if (i&7)==7: mix_all_8_words()
\`\`\`

The "mix all 8 words" step at the end of every 8th round is GF(2) linear with byte doubling (\`xtime\`) folded in, basically a cousin of AES MixColumns. Confirmed it byte by byte against live gdb dumps before trusting it for anything downstream.

### The anti-debug trap, and why gdb kept lying to me

Somewhere in \`nativeProbe\` there's a check that:

- reads \`/proc/self/status\` looking for a nonzero \`TracerPid\`
- greps \`/proc/self/maps\` for \`frida\`, \`gum-js\`, \`xposed\`
- compares the signing cert hash against an embedded value
- checks that the reported API level is 36

Each failure XORs a different constant into a running status dword (tracer: \`0x13579BDF\`, cert: \`0x6D2B79F5\`, API level: \`0x94D049BB\`). That status dword then feeds straight into the BLAKE2s input.

Offline reproduction failed with the same bearing. The difference was TracerPid (debugger attached vs clean). \`TracerPid\` was nonzero under gdb and zero without it, which meant every single dump I'd been trusting as "ground truth" was actually a poisoned run. Model + poisoned status (0x13579BDF, TracerPid\u22600 under gdb) reproduced the gdb-era dump (698a980c...); clean runs need status=0. One naming trap that cost me a second round of confusion: cert here is the 32-byte cert SHA-256 passed to nativeProbe (certSha256 in the JNI signature - sha256 of the DER cert, 4e3b9f67...), not the DER file itself. Feeding the DER gives a plausible-looking but wrong key (36ce11c3...); with the hash it reproduces exactly:

\`\`\`python
import subprocess, hashlib
pem = subprocess.check_output(['openssl', 'pkcs7', '-inform', 'DER',
                               '-in', 'META-INF/HADAL.RSA',
                               '-print_certs', '-out', '/dev/stdout'])
der = subprocess.check_output(['openssl', 'x509', '-outform', 'DER'], input=pem)
certHash = hashlib.sha256(der).digest()  # 4e3b9f67... (32 bytes)
key = hashlib.blake2s(prefix + B + F(B) + T_le + SP_le + certHash + e16 + b'\x00' * 4, digest_size=32).digest()
# T_le/SP_le = LE packs of the printed T/SP words; B/X = LE packs of the bearing/F(B) words; prefix = the 19 bytes hadopelagic/key/v3\0 from the .so; nonce/ct = APK offsets 0x49044/0x49054.
\`\`\`

### Cracking the signing block, then inverting F

The APK Signing Block v2 area had a custom attribute sitting right there in the open:

\`\`\`text
SP[8] || X_target[32] || nonce[12] || len || ct[71]
\`\`\`

\`X_target\` is \`F(B*)\`, the output of the transform applied to the correct bearing:

\`\`\`text
X_target = 124e7fb9 c779c176 9f158e23 8ec85140 818cc0bf 0a22b7b0 37e76daa 1c7d3300  # BE word order; bytes at 0x49024 LE: b97f4e12 76c179c7 238e159f 4051c88e fc08c81b 0b7220aa a6de737 00337d1c - hash uses LE
\`\`\`

So the challenge just hands you the answer to \`F(B*)\` and dares you to invert \`F\`. Brute force over 32 bytes is infeasible.

The break: every rotation amount in cdfc0 depends only on round index and fixed tables, never on data, so the whole thing inverts cleanly:

- \`y = rol((C + x) ^ k, r)\` inverts to \`x = (rotr(y, r) ^ k) - C\`
- the linear mix step inverts via a 32x32 matrix inverse over GF(2)
- run the 96 rounds backwards, undoing each step in reverse order

Wrote Finv, verified it over 200 random roundtrips (after fixing one flipped sub-step order), ran it on X_target:

\`\`\`python
def build_params():
    P = []
    for i in range(96):
        m1 = (SP[i & 7] + i) & 7
        ebp = (0x9E3779B9 * (i + 1)) & M
        ebp ^= WK[m1]; ebp ^= SP[(3*i) & 7]; ebp ^= E16W[i & 3]
        ebp = rol(ebp, 13*i + h31(13*i) + 1)
        u = ((ebp >> 27) + i) & 0xFF
        a2 = h8(u) & 31
        bval = ((ebp >> 19) + 3*i) & M
        a3 = (h31(bval) + bval + 1) & 31
        P.append((ebp, i & 7, (5*i+3) & 7, (i+2) & 7, (i & 7) ^ 4, a2, a3))
    return P

def _fword(v):
    b0, b1, b2, b3 = v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF
    d0, d1, d2, d3 = xt(b0), xt(b1), xt(b2), xt(b3)
    return ((b3^d0^d1^b1^b2) | ((b3^b0^b2^d1^d2) << 8)
            | ((b3^d3^b1^b0^d2) << 16) | ((d3^d0^b0^b1^b2) << 24))

def _inv_table():
    cols = [_fword(1 << k) for k in range(32)]
    basis = {}
    for k in range(32):
        i2, t2 = cols[k], 1 << k
        while i2:
            hb = i2.bit_length() - 1
            if hb in basis:
                bi, bt = basis[hb]; i2 ^= bi; t2 ^= bt
            else:
                basis[hb] = (i2, t2); break
    inv = []
    for j in range(32):
        i2, t2 = 1 << j, 0
        while i2:
            hb = i2.bit_length() - 1
            bi, bt = basis[hb]; i2 ^= bi; t2 ^= bt
        inv.append(t2)
    return inv

_INVW = _inv_table()

def inv_mix(W):
    rec = [0]*8
    for j in range(8):
        v, r = W[j], 0
        for b in range(32):
            if (v >> b) & 1:
                r ^= _INVW[b]
        rec[j] = r
    for j in range(8):
        W[IDX[j]] = rec[j]

def Finv(out_words):
    P = build_params()
    W = list(out_words)
    for i in reversed(range(96)):
        if (i & 7) == 7:
            inv_mix(W)
        ebp2, r11, xs, aslot, fx, a2, a3 = P[i]
        W[fx] ^= rol((W[r11] + W[aslot]) & M, a3)
        # NOTE ORDER: rotr(y, a2) ^ W[xs] - not rotr(y ^ W[xs], a2)
        W[r11] = ((ror(W[r11], a2) ^ W[xs]) - ebp2) & M
    return W

B_star = Finv(X_target)
# = 414a3bce c9aec4ec 456121e2 073056af
#   fb9da12d 8c48b0e3 d820fcfb 6c01f316
bearing_hex = b''.join(struct.pack('<I', w) for w in B_star).hex()
# = ce3b4a41ecc4aec9e2216145af5630072da19dfbe3b0488cfbfc20d816f3016c  # LE bytes of BE words
\`\`\`

### Landing the plane

Fed that bearing through the clean (untraced) harness:

\`\`\`text
bearing: ce3b4a41ecc4aec9e2216145af5630072da19dfbe3b0488cfbfc20d816f3016c
key:     27fd0b6ec11195b4bf27f654b4d3ee3a509b22b5155b244b90f1840e96104e1e
flag:    zdk{bELOw_the_THerMOClIn3_two_SHADER_CURrENts_ConVERgE}
\`\`\`

Poly1305 tag checks out.

### The scripts that actually mattered

SpecId parsing, since it bit me once:

\`\`\`python
# parse SpecId decorations first!
rid2spec = {}
# ... for each OpDecorate with decoration==1: rid2spec[result_id] = spec_id
# then OpSpecConstant result gets spec value by rid2spec[rid]
\`\`\`

The helper functions and tables (rol, h31, SP, WK, ...) are defined in full in the scripts section below; the snippets above assume them.

The \`F\` model, \`cdfc0\`, core loop (helpers defined, then pseudocode - exact constants precomputed):

\`\`\`python
M = 0xFFFFFFFF
def rol(v, n):
    n &= 31
    return ((v << n) & M) | (v >> (32 - n)) if n else v & M
def ror(v, n):
    return rol(v, 32 - n)
def h31(x):
    v = x & 0xFFFF
    q = (v * 0x843) >> 16
    t = (x - q) & 0xFFFF
    return ((t >> 1) + q) >> 4
def h8(u):
    q = (u * 9) >> 8
    c = (u - q) & 0xFF; c >>= 1
    c = (c + q) & 0xFF; c >>= 4
    c = (c + u) & 0xFF
    return (c + 1) & 0xFF
def xt(x):
    return ((x << 1) ^ (0x1B if x & 0x80 else 0)) & 0xFF
IDX = [3, 0, 6, 1, 7, 4, 2, 5]
def mix(W):
    src = list(W)
    for j in range(8):
        v = src[IDX[j]]
        b0, b1, b2, b3 = v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF
        d0, d1, d2, d3 = xt(b0), xt(b1), xt(b2), xt(b3)
        W[j] = ((b3^d0^d1^b1^b2) | ((b3^b0^b2^d1^d2) << 8)
                | ((b3^d3^b1^b0^d2) << 16) | ((d3^d0^b0^b1^b2) << 24))
SP = [0x026c2a46, 0xef568048, 0x1b9bebf3, 0xc4c2e6e4,
      0xc3fa5451, 0xc877b4fd, 0x128288ac, 0xff275cf3]
E16W = [0x2f6ae791, 0x58bd03c4, 0xa9e8127d, 0x70cb3645]  # e16 as LE words
WK = T_WORDS + R_WORDS[8:]  # 64-word wake buffer; T as printed above (67a79866...), R parsed from reef.glsl uvec4 lines; rounds only read [0..7]

def cdfc0(in_words):
    W = list(in_words)
    for i in range(96):
        m1 = (SP[i & 7] + i) & 7
        ebp = (0x9E3779B9 * (i + 1)) & M
        ebp ^= WK[m1]; ebp ^= SP[(3*i) & 7]; ebp ^= E16W[i & 3]
        ebp = rol(ebp, 13*i + h31(13*i) + 1)
        u = ((ebp >> 27) + i) & 0xFF
        bval = ((ebp >> 19) + 3*i) & M
        ebp = (ebp + W[i & 7]) & M
        ebp ^= W[(5*i + 3) & 7]
        ebp = rol(ebp, h8(u))
        W[i & 7] = ebp
        ebp = (ebp + W[(i+2) & 7]) & M
        ebp = rol(ebp, h31(bval) + bval + 1)
        W[(i & 7) ^ 4] ^= ebp
        if (i & 7) == 7:
            mix(W)
    return W
\`\`\`

And the finish line, invert, rebuild, decrypt:

\`\`\`python
import struct, hashlib, subprocess
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
apk = open('hadopelagic.apk', 'rb').read()
lib = open('libhadopelagic.so', 'rb').read()
F = cdfc0  # the mixer from the previous section
SPb = apk[0x49004:0x49004 + 32]                       # 8 spec words, LE
X_apk = apk[0x49024:0x49024 + 32]                     # X_target bytes (LE order)
X_target_words = list(struct.unpack('<8I', X_apk))
T_words = [0x67a79866, 0x3d335082, 0xf5a9f31f, 0xb78cc296,
           0x96369a34, 0x06a7651d, 0xf2c433ee, 0x535e127f]
T_le = b''.join(struct.pack('<I', w) for w in T_words)
SP_le = SPb
prefix = lib[lib.find(b'hadopelagic/key/v3'):lib.find(b'hadopelagic/key/v3') + 19]
nonce, ct = apk[0x49044:0x49044 + 12], apk[0x49054:0x49054 + 71]
B_star = Finv(X_target_words)
X = F(B_star)                          # == X_target
B_bytes = b''.join(struct.pack('<I', w) for w in B_star)
X_bytes = b''.join(struct.pack('<I', w) for w in X)
e16 = bytes([0x91, 0xE7, 0x6A, 0x2F, 0xC4, 0x03, 0xBD, 0x58,
             0x7D, 0x12, 0xE8, 0xA9, 0x45, 0x36, 0xCB, 0x70])
key = hashlib.blake2s(prefix + B_bytes + X_bytes + T_le + SP_le + certHash + e16 + b'\x00' * 4, digest_size=32).digest()
flag = ChaCha20Poly1305(key).decrypt(nonce, ct, None)   # zdk{bELOw_the_THerMOClIn3_two_SHADER_CURrENts_ConVERgE}
\`\`\`

The harness and shim sources (\`harness.c\`, \`vk_shims.c\`, \`gl_shims.c\`, \`libc_stub.c\`) are longer than they are interesting. The Python model above plus \`finv.py\` is really the whole story.

---

## Part 2: VMception

> "Our license checker was designed by someone who thought assembly wasn't low-level enough."

End state:

\`\`\`text
license: N3BULA-7A91-X0R5-VM42
flag:    zdk{V1r7u4L_macHLnes_ARE_FUn}
\`\`\`

### What we're dealing with

One stripped x86-64 Linux binary. Run it and:

\`\`\`text
=== ZDK License Verification System ===
License key: <input>
[-] Invalid license   (exit 1)
\`\`\`

Not a lot to go on from the outside. Poking at \`main\` shows it demands exactly 21 characters, then:

1. \`malloc\`s a 0x2a8-byte heap chunk and runs an init routine that decrypts a program into it.
2. A loader transforms your 21-byte license into some internal VM memory layout.
3. \`run()\` executes the decrypted bytecode against that memory.
4. If everything checks out, it prints success and derives a 29-byte flag from register state.

Translation: this isn't a license check, it's a small CPU, and your license key is the input tape.

### Two separate memory spaces, mixed up at first

Initially assumed single VM state blob - addresses didn't match.

Turned out there are actually three distinct regions:

- A **VM struct** on the stack: 8 qword registers at \`+0x00\`, a small stack at \`+0x40\`, a data region at \`+0x140\`, the transformed license at \`+0x180\`, a running hash at \`+0x240\`, plus pc/flags/status bytes.
- A **heap buffer** (0x2a8 bytes): the actual bytecode program, sitting encrypted until init decrypts it.
- A **12-byte array on the stack** that I initially read as more program bytes. It isn't. It's a *patch table*, instructions for modifying the heap program at runtime rather than instructions to run.

The 12-byte patch table is not code - disassembling it gives nonsense.

### Fifteen opcodes, one dispatch table

Found the dispatch table at file offset \`0x2080\`, mapping a raw opcode byte to one of 15 handlers (the remaining tables sit at fixed file offsets alongside it: TBL_MAP at 0x2180, TBL_ENC at 0x21a0, TBL_A at 0x2450, TBL_B at 0x2460):

\`\`\`text
1  LDI   [op][reg][imm]     regs[r] = imm
2  LDM   [op][reg][addr]    regs[r] = mem8[0x140+addr]
3  STM   [op][addr][reg]    mem8[0x140+addr] = regs[r] & 0xff
4  XOR   [op][ra][rb]
5  ADD   [op][ra][rb]
6  SUB   [op][ra][rb]
7  ROL   [op][reg][imm]     (byte rotate)
8  ROR   [op][reg][imm]
9  CMP   [op][ra][rb]       flags = (eq); on success patch heap[off] ^= k
10 JNZ   [op][lo][hi]       pc += sign16 if flags != 0
11 JZ    [op][lo][hi]       pc += sign16 if flags == 0
12 PUSH  [op][reg]
13 POP   [op][reg]
14 MIX   [op][ra][rb]       regs[ra] = rol8((regs[ra]^regs[rb]) + 0x37, regs[rb])
15 END   [op][flag]         halt; success = (flag == 1)
\`\`\`

Straightforward once extracted. Dumped dispatch table at 0x2080, used AI to generate 15 handler skeletons, verified manually.

Heap decryption, once reversed, turned out simple:

\`\`\`python
heap[0] = 0x23
ecx = 0x54
for i in range(1, 0x2a8):
    b = TBL_ENC[i] ^ (ecx & 0xFF) ^ TBL_B[i & 15] ^ TBL_A[i & 15]
    ecx += 0x3D
    heap[i] = b
\`\`\`

And the license loader, which turns your 21 input bytes into the VM's working memory while also accumulating a running hash as it goes:

\`\`\`python
h = 0x1337C0DE5EEDBEEF  # helpers rol8/rol64 defined in solver below
for i, byte in enumerate(license_bytes):
    prod = i * 0xCCCCCCCCCCCCCCCD
    hi = prod >> 64
    q = ((hi & ~3) + (hi >> 2)) & ((1 << 64) - 1)
    al = rol8(byte ^ 0x5A, (i - q) & 7)
    al = (al + TBL_MAP[i]) & 0xFF
    mem[0x180 + i] = al
    h = rol64(h ^ al, 7) * 0x9E3779B185EBCA87
\`\`\`

\`divstuff\` is a divide-by-5 disguised as a magic-constant multiply (\`0xCCCCCCCCCCCCCCCD\`), a fairly standard compiler trick for turning division into multiplication and a reasonably standard thing for a challenge author to lean on for extra confusion. I emulated it exactly rather than trying to simplify it away, mostly because my first attempt at "simplifying" it introduced a rounding error that threw every downstream byte off by one on certain inputs.

### Self-modifying, and confusing because of it

Every successful \`CMP\` fires off a patch from the 12-byte table:

\`\`\`text
entry: u16 heap_offset | xor_byte | unused
heap[offset] ^= xor_byte   # only if offset < current pc
\`\`\`

The starting patches were \`heap[0x0c]^=0xa5\`, \`heap[0x1b]^=0x5a\`, \`heap[0x2a]^=0xc3\`, \`heap[0x3f]^=0x3c\`. Before that clicked, I kept disassembling the heap once, statically, but a correct early comparison rewrites later bytes, so the snapshot I was reading was never the code that would run. Once I accepted that the program mutates itself as it runs and started re-dumping the heap after each patch point, the control flow finally made sense. Jumps route around the various failure stubs, and any wrong byte halts things early.

### Turning the VM into a constraint system

Once the program was fully mapped out (license index equals \`addr - 0x40\`, since the transformed license lives at that stack offset), it reduced to a system of byte constraints:

\`\`\`text
t[6]==0xA6, t[11]==0x12, t[16]==0x75
rol(t[5],3)==0x64, rol(t[8],2)==0xEE
t[0]^t[1]==0x5E, t[1]^t[2]==0xDB, ... (full XOR chain 0..19)
MIX(t[2],t[9])==0x56, t[3]+t[14]==0x09, t[4]-t[17]==0x42,
t[7]^t[18]==0x3C, t[10]+t[20]==0xFF, MIX(t[12],t[15])==0xE6,
t[13]-t[19]==0x8B, t[0]^t[20]==0xDD, t[1]+t[12]==0x42,
MIX(t[16],t[17])==0xAB
\`\`\`

Plus the running hash needing to land exactly on \`0xCD0320F4ACAE3BD6\` (the \`MIX(t[0],t[3])\` result is overwritten by \`LDI r7,0xA5; END\` and \`r7==0xA5\` is a success signal, not a license constraint).

First move: throw it at Z3. It returned a solution fast; the binary rejected it. The bug: Z3 treated SUB constraints as signed by default; the VM is all unsigned bytes. Fixed that, got a second candidate, also rejected, this time from an underconstrained model missing the hash and anchors. With the full chain + combos + hash the solution is unique, so I dropped the solver and propagated by hand:

Manual propagation instead: XOR chain outward from the anchors, brute-force the leftovers, verify against the hash:

\`\`\`text
t = 27 79 a2 51 8d 8c a6 ba bb 8c 05 12 c9 c0 b8 5f 75 4b 86 35 fa
\`\`\`

Then just ran the loader transform backwards:

\`\`\`python
def rot_amount(i):
    prod = i * 0xCCCCCCCCCCCCCCCD
    hi = prod >> 64
    q = ((hi & ~3) + (hi >> 2)) & ((1 << 64) - 1)
    return (i - q) & 7

lic = bytes((ror8((t[i] - TBL_MAP[i]) & 0xFF, rot_amount(i)) ^ 0x5A) for i in range(21))
# lic == b'N3BULA-7A91-X0R5-VM42'
\`\`\`

### Flag

\`\`\`bash
echo "N3BULA-7A91-X0R5-VM42" | ./vmception
# === ZDK License Verification System ===
# License key: [+] License accepted
# zdk{V1r7u4L_macHLnes_ARE_FUn}
\`\`\`

### The solver, in shape

\`\`\`python
def solve_t():
    t = [None]*21
    def setc(i, v):
        t[i] = v
    def rol8(x, n):
        n &= 7
        return ((x << n) & 0xFF) | (x >> (8-n)) if n else x & 0xFF
    def ror8(x, n):
        return rol8(x, 8-n)
    def mix(a, b):
        return rol8((a ^ b) + 0x37, b & 7)

    # anchored bytes from VM heap
    setc(6, 0xA6)
    setc(11, 0x12)
    setc(16, 0x75)
    setc(5, ror8(0x64, 3))
    setc(8, ror8(0xEE, 2))

    # full XOR chain 0..19 (extracted from heap program 0x140+addr)
    xor_chain = [
        (0, 1, 0x5E), (1, 2, 0xDB), (2, 3, 0xF3), (3, 4, 0xDC), (4, 5, 0x01),
        (5, 6, 0x2A), (6, 7, 0x1C), (7, 8, 0x01), (8, 9, 0x37), (9, 10, 0x89),
        (10, 11, 0x17), (11, 12, 0xDB), (12, 13, 0x09), (13, 14, 0x78), (14, 15, 0xE7),
        (15, 16, 0x2A), (16, 17, 0x3E), (17, 18, 0xCD), (18, 19, 0xB3), (19, 20, 0xCF),
    ]
    # propagate XOR chain until stable
    changed = True
    while changed:
        changed = False
        for a, b, c in xor_chain:
            if t[a] is not None and t[b] is None:
                t[b] = t[a] ^ c; changed = True
            elif t[b] is not None and t[a] is None:
                t[a] = t[b] ^ c; changed = True

    # single-byte constraints - brute force remaining unknowns
    # MIX / ADD / SUB / XOR as per heap program
    def rol64(v, s):
        s &= 63
        return ((v << s) | (v >> (64 - s))) & ((1 << 64) - 1) if s else v
    def check():
        if mix(t[2], t[9]) != 0x56: return False
        if (t[3] + t[14]) & 0xFF != 0x09: return False
        if (t[4] - t[17]) & 0xFF != 0x42: return False
        if (t[7] ^ t[18]) != 0x3C: return False
        if (t[10] + t[20]) & 0xFF != 0xFF: return False
        if mix(t[12], t[15]) != 0xE6: return False
        if (t[13] - t[19]) & 0xFF != 0x8B: return False
        if (t[0] ^ t[20]) != 0xDD: return False
        if (t[1] + t[12]) & 0xFF != 0x42: return False
        if mix(t[16], t[17]) != 0xAB: return False
        # t[7]==0xA5 is success signal from LDI r7,0xA5 before END, not a license constraint - checked as program post-condition
        # hash check
        h = 0x1337C0DE5EEDBEEF
        for i in range(21):
            h = rol64(h ^ t[i], 7) * 0x9E3779B185EBCA87 & ((1<<64)-1)
        if h != 0xCD0320F4ACAE3BD6: return False
        return True

    # brute force remaining None bytes
    import itertools
    unknowns = [i for i, v in enumerate(t) if v is None]
    for vals in itertools.product(range(256), repeat=len(unknowns)):
        for idx, val in zip(unknowns, vals):
            t[idx] = val
        if check():
            return t
    return None
\`\`\`

---

## Takeaways

**Run hostile code natively, even when the setup hurts.** The Hadopelagic harness replaced weeks of hand-decompiling with watching logs scroll by. Nearly every shim broke on its first run and needed a second pass, but patching ELF version tags and faking a GPU was still less work than reading one stripped function by hand.

**Ground truth each model before stacking the next one on it.** The mix step earned trust byte by byte against live dumps. Every skip cost real time: SpecId-as-index, the loader-math shortcut, Z3's signed SUBs. (And the dumps I trusted most turned out to be poisoned runs, see below.)

**Debuggers change the thing you're debugging.** TracerPid meant gdb and clean runs disagreed, and I burned time trusting the wrong ground truth before catching it.

**A solver is only as good as its constraints.** Z3 gave two wrong answers and got dropped: unsigned bytes modeled as signed, then an underconstrained model missing the hash and anchors. Manual propagation was slower to set up and easier to trust. Same pattern in Hadopelagic: exact inversion, ARX rounds backward plus a GF(2) matrix inverse, beats guessing, once invertibility is confirmed first.

---

## References

Material referenced or relied on during these solves:

- **SPIR-V specification** (result IDs vs SpecId decorations, OpSpecConstant): [Khronos SPIR-V Registry](https://registry.khronos.org/SPIR-V/specs/unified1/SPIRV.html)
- **SPIRV-Tools** (\`spirv-dis\`, used to disassemble \`trench.spv\`): [KhronosGroup/SPIRV-Tools](https://github.com/KhronosGroup/SPIRV-Tools)
- **BLAKE2** (identified by IV word \`0x6b08e647\`, sigma table, 16/12/8/7 rotations): [RFC 7693](https://www.rfc-editor.org/rfc/rfc7693.html)
- **ChaCha20-Poly1305** (the final decrypt, key/nonce/ciphertext split): [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439.html)
- **APK Signature Scheme v2** (the signing block at \`0x49004\` holding SP, X_target, nonce, ct): [Android source docs](https://source.android.com/docs/security/features/apksigning/v2)
- **Z3 theorem prover** (VMception constraint attempts, signed vs unsigned pitfall): [Z3Prover/z3](https://github.com/Z3Prover/z3)
- **jadx** (DEX entry point, \`nativeProbe\` JNI signature): [skylot/jadx](https://github.com/skylot/jadx)
- **AES MixColumns** (the cousin of the GF(2) \`xtime\` mix step in \`cdfc0\`): [FIPS 197](https://csrc.nist.gov/pubs/fips/197/final)
- **TracerPid** (the anti-debug check via \`/proc/self/status\`): [proc_pid_status man page](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html)
- **Division by magic multiplication** (the divide-by-5 behind \`divstuff\`, \`0xCCCCCCCCCCCCCCCD\`): [Hacker's Delight](http://www.hackersdelight.org/)
`,
  },
  {
    id: "heap-overflow-elf-hunting",
    title: "Deep Dive: Hunting Heap Overflows in ELF Binaries",
    description: "An in-depth analysis of glibc allocator dynamics, heap chunk structures, and exploiting classic double-free & heap corruption - demo showcases a left progress index, right marginalia, callouts, figures, tables, footnotes.",
    date: "May 18, 2026",
    readTime: "18 min read",
    category: "Binary Analysis",
    tags: ["heap-exploitation", "glibc", "pwn", "elf", "linux", "demo"],
    image: "/images/pixel-clouds-blog.jpg",
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
  }
];
