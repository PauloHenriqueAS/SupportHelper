from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SourceFile:
    path: Path          # caminho absoluto no disco
    relative: str       # caminho relativo a raiz da base (usado como nome de exibicao)


@dataclass
class SourceListing:
    files: list[SourceFile]
    ignored: list[str]  # arquivos com formato nao suportado


class KnowledgeSource(ABC):
    """Origem dos documentos da base de conhecimento.

    Hoje so existe a pasta local; fontes remotas (S3, Drive) podem implementar
    esta interface baixando os arquivos para um cache local.
    """

    @abstractmethod
    def root(self) -> Path: ...

    @abstractmethod
    def list_files(self) -> SourceListing: ...
