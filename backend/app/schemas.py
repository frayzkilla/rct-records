from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(Input):
    username: Name
    password: str = Field(min_length=1, max_length=128)


class AdminCreate(Input):
    username: Name
    password: Password
    artistId: int = Field(gt=0)


class AdminUpdate(Input):
    username: Name | None = None
    password: Password | None = None
    artistId: int | None = Field(default=None, gt=0)


class ArtistInput(Input):
    name: Name
    bio: str = Field(default="", max_length=10000)


class AlbumInput(Input):
    title: Name
    releaseDate: date
    artistId: int = Field(gt=0)


class TrackInput(Input):
    title: Name
    artistId: int = Field(gt=0)
    albumId: int | None = Field(default=None, gt=0)
