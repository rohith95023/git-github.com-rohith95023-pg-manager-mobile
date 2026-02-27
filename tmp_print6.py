from pathlib import Path
lines = Path('src/hooks/usePGs.ts').read_text().splitlines()
for i,line in enumerate(lines,1):
    if 310<=i<=360:
        print(f"{i:03}: {line}")
