"""Divide texto em trechos de tamanho controlado, respeitando paragrafos quando possivel."""

from dataclasses import dataclass
from typing import Optional

from .parsers import TextBlock

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


@dataclass
class Chunk:
    text: str
    index: int
    page: Optional[int] = None


def _split_long(text: str, size: int, overlap: int) -> list[str]:
    pieces: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        pieces.append(text[start:end])
        if end == len(text):
            break
        start = max(end - overlap, start + 1)
    return pieces


def chunk_blocks(blocks: list[TextBlock], size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[Chunk]:
    chunks: list[Chunk] = []
    index = 0
    for block in blocks:
        paragraphs = [p.strip() for p in block.text.replace("\r\n", "\n").split("\n\n")]
        paragraphs = [p for p in paragraphs if p]
        buffer = ""
        for paragraph in paragraphs:
            if len(paragraph) > size:
                if buffer:
                    chunks.append(Chunk(buffer, index, block.page))
                    index += 1
                    buffer = ""
                for piece in _split_long(paragraph, size, overlap):
                    chunks.append(Chunk(piece, index, block.page))
                    index += 1
                continue
            candidate = f"{buffer}\n\n{paragraph}" if buffer else paragraph
            if len(candidate) <= size:
                buffer = candidate
            else:
                chunks.append(Chunk(buffer, index, block.page))
                index += 1
                # overlap: carrega o final do buffer anterior para manter contexto
                tail = buffer[-overlap:] if overlap and len(buffer) > overlap else ""
                buffer = f"{tail}\n\n{paragraph}".strip() if tail else paragraph
        if buffer:
            chunks.append(Chunk(buffer, index, block.page))
            index += 1
    return chunks
