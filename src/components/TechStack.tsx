export default function TechStack() {
  const groups: { label: string; items: { name: string; domain: string; href: string }[] }[] = [
    {
      label: 'Languages & Scripting',
      items: [
        { name: 'C', domain: 'en.cppreference.com', href: 'https://en.cppreference.com/w/c/language' },
        { name: 'C++', domain: 'isocpp.org', href: 'https://isocpp.org' },
        { name: 'Python', domain: 'www.python.org', href: 'https://www.python.org' },
        { name: 'Go', domain: 'go.dev', href: 'https://go.dev' },
        { name: 'Bash', domain: 'www.gnu.org', href: 'https://www.gnu.org/software/bash' },
        { name: 'Arduino', domain: 'arduino.cc', href: 'https://www.arduino.cc' },
      ],
    },
    {
      label: 'Web & Data',
      items: [
        { name: 'React', domain: 'react.dev', href: 'https://react.dev' },
        { name: 'Next.js', domain: 'nextjs.org', href: 'https://nextjs.org' },
        { name: 'MySQL', domain: 'www.mysql.com', href: 'https://www.mysql.com' },
      ],
    },
    {
      label: 'Infra & Cloud',
      items: [
        { name: 'Docker', domain: 'www.docker.com', href: 'https://www.docker.com' },
        { name: 'Kubernetes', domain: 'kubernetes.io', href: 'https://kubernetes.io' },
        { name: 'Linux', domain: 'www.kernel.org', href: 'https://www.kernel.org' },
        { name: 'CI/CD', domain: 'github.com', href: 'https://github.com/features/actions' },
        { name: 'Azure', domain: 'azure.microsoft.com', href: 'https://azure.microsoft.com' },
      ],
    },
  ]

  return (
    <div className="bento p-6 flex flex-col gap-4" id="tech-stack-card">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-[18px] leading-none" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>
          Skills & <span style={{ color: 'var(--muted-foreground)' }}>stacks.</span>
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>
          Here&apos;s a snapshot of the technologies I work with regularly:
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              {g.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {g.items.map((it) => (
                <a key={it.name} href={it.href} target="_blank" rel="noreferrer" className="flex h-fit w-fit">
                  <div
                    className="flex items-center h-[32px] rounded-lg border bg-[var(--card-inner)] px-1.5 transition-colors hover:bg-[var(--card-border)]"
                    style={{ gap: '0.5rem', borderColor: 'var(--card-border)' }}
                  >
                    <div className="flex items-center justify-center overflow-hidden rounded-md shrink-0" style={{ width: '1.5rem', height: '1.5rem', background: 'var(--background)' }}>
                      <img
                        alt={`${it.name} logo`}
                        loading="lazy"
                        width={24}
                        height={24}
                        src={`https://www.google.com/s2/favicons?domain=${it.domain}&sz=64`}
                        style={{ width: '1.5rem', height: '1.5rem', objectFit: 'cover', filter: 'grayscale(1) contrast(1.15) brightness(0.95)', opacity: 0.82 }}
                      />
                    </div>
                    <span className="text-[13px] font-medium pr-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
                      {it.name}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
