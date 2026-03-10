# Re-export everything from the shared core layer.
# All existing consumers (gui/widgets/*, tests/) keep their imports unchanged.
from core.models import (  # noqa: F401
    PersonalInfo,
    SkillCategory,
    Experience,
    Education,
    Project,
    LibraryProject,
    Award,
    ResumeData,
)
