from typing import Dict, List
from pydantic import BaseModel, Field


class PromptTemplate(BaseModel):
    name: str
    template: str
    placeholders: List[str] = Field(default_factory=list)

    def render(self, values: Dict[str, str]) -> str:
        result = self.template
        for key, val in values.items():
            result = result.replace(f"{{{{{key}}}}}", val)
        return result

    @classmethod
    def extract_placeholders(cls, template: str) -> List[str]:
        import re

        return re.findall(r"{{(.*?)}}", template)
