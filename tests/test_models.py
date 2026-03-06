import pytest
from gui.models import PersonalInfo, Experience, Project, ResumeData, Education


def test_personal_info_dataclass_mapping():
    data = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1 234 567 8900",
        "location": "New York, USA",
        "linkedin": "linkedin.com/in/janedoe"
    }
    
    info = PersonalInfo.model_validate(data)
    assert info.name == "Jane Doe"
    assert info.location == "New York, USA"
    assert info.github == ""

    serialized = info.model_dump(by_alias=True)
    assert serialized["name"] == "Jane Doe"
    assert serialized["linkedin"] == "linkedin.com/in/janedoe"


def test_experience_backward_compatibility():
    # Older JSON schema uses "position" and "duration"
    legacy_data = {
        "company": "Tech Corp",
        "position": "Software Engineer",
        "duration": "2020 - 2023",
        "achievements": ["Built things", "Deployed things"]
    }
    
    exp = Experience.model_validate(legacy_data)
    
    # Assert fields are correctly mapped to internal nomenclature
    assert exp.company == "Tech Corp"
    assert exp.title == "Software Engineer"
    assert exp.date == "2020 - 2023"
    assert exp.achievements == ["Built things", "Deployed things"]
    
    # Verify exact to_dict output matching Jinja requirements
    serialized = exp.model_dump(by_alias=True)
    assert "date" not in serialized
    assert serialized["position"] == "Software Engineer"
    assert serialized["duration"] == "2020 - 2023"


def test_project_backward_compatibility():
    # Older JSON schema uses "year" and "technologies" and string descriptions
    legacy_data = {
        "name": "AI Pipeline",
        "year": "2022",
        "technologies": "Python, AWS",
        "description": "I built an AI pipeline."
    }
    
    proj = Project.model_validate(legacy_data)
    
    # Assert mapped to new standard Dataclass attributes
    assert proj.date == "2022"
    assert proj.tech_stack == "Python, AWS"
    # Should convert string description to single-item list
    assert proj.description == ["I built an AI pipeline."]


def test_resume_data_full_serialization():
    data = {"personal_info": {"name": "Bob"}}
    resume = ResumeData.model_validate(data)
    assert resume.personal_info.name == "Bob"
    # Should handle implicit empty lists for other missing sections seamlessly
    assert resume.education == []
    assert resume.experience == []
    assert resume.projects == []


def test_education_backward_compatibility():
    legacy_data = {
        "institution": "University",
        "degree": "B.S. CS",
        "duration": "2017-2021",
        "Relevant coursework": "Maths, Data Structures, Algorithms"
    }
    edu = Education.model_validate(legacy_data)
    
    assert edu.date == "2017-2021"
    assert edu.coursework == ["Maths", "Data Structures", "Algorithms"]


def test_resume_data_legacy_skills_dict():
    # Tests that the {"Category": ["A", "B"]} format parses correctly into objects
    legacy_data = {
        "skills": {
            "Languages": ["Python", "Go"],
            "Tools": ["Docker"]
        }
    }
    resume = ResumeData.model_validate(legacy_data)
    
    assert len(resume.skills) == 2
    assert resume.skills[0].category == "Languages"
    assert resume.skills[0].items == ["Python", "Go"]
    assert resume.skills[1].category == "Tools"
    assert resume.skills[1].items == ["Docker"]

    # Verify how it serializes back out
    out = resume.model_dump(by_alias=True)
    assert out["skills"] == [
        {"category": "Languages", "items": ["Python", "Go"]},
        {"category": "Tools", "items": ["Docker"]}
    ]
