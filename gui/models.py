from typing import List, Optional, Any
from pydantic import BaseModel, Field, AliasChoices, field_validator


class PersonalInfo(BaseModel):
    name: str = ""
    location: str = ""
    tagline: str = ""
    email: str = ""
    phone: str = ""
    github: str = ""
    linkedin: str = ""


class SkillCategory(BaseModel):
    category: str = ""
    items: List[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: str = ""
    title: str = Field(default="", validation_alias=AliasChoices("title", "position"), serialization_alias="position")
    location: str = ""
    date: str = Field(default="", validation_alias=AliasChoices("duration", "date"), serialization_alias="duration")
    achievements: List[str] = Field(default_factory=list)

    @field_validator("achievements", mode="before")
    @classmethod
    def coerce_achievements(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            # Split by newline but clean up whitespace
            return [x.strip() for x in v.split("\n") if x.strip()]
        return v


class Education(BaseModel):
    institution: str = ""
    degree: str = ""
    location: str = ""
    date: str = Field(default="", validation_alias=AliasChoices("duration", "date"), serialization_alias="duration")
    coursework: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("coursework", "Relevant coursework"),
        serialization_alias="Relevant coursework",
    )

    @field_validator("coursework", mode="before")
    @classmethod
    def coerce_coursework(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            import re
            # Split by comma but clean up whitespace
            return [x.strip() for x in re.split(r",\s*", v) if x.strip()]
        return v


class Project(BaseModel):
    name: str = ""
    tech_stack: str = Field(
        default="",
        validation_alias=AliasChoices("technologies", "tech_stack"),
        serialization_alias="technologies",
    )
    date: str = Field(default="", validation_alias=AliasChoices("year", "date"), serialization_alias="year")
    description: List[str] = Field(default_factory=list)

    @field_validator("description", mode="before")
    @classmethod
    def coerce_description(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            # Split by newline but clean up whitespace
            return [x.strip() for x in v.split("\n") if x.strip()]
        return v


class Award(BaseModel):
    title: str = ""
    issuer: str = ""
    date: str = Field(default="", validation_alias=AliasChoices("description", "date"), serialization_alias="description")


class ResumeData(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    skills: List[SkillCategory] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    awards: List[Award] = Field(default_factory=list)

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skills(cls, v: Any) -> List[Any]:
        # Legacy JSON often structured skills as {"Category": ["Skill A", "Skill B"]}
        # We must map this to [{"category": "Category", "items": ["Skill A", "Skill B"]}]
        if isinstance(v, dict):
            return [{"category": k, "items": val} for k, val in v.items()]
        return v
