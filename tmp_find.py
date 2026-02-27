from pathlib import Path
text = Path('src/hooks/usePGs.ts').read_text()
print(text.count('AsyncStoragePlaceholder'))
