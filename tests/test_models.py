import pytest
from gui.models import PersonalInfo, Experience, Project, ResumeData, Education, SkillCategory, Award, LibraryProject


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


def test_skill_category_comma_string_coercion():
    """items stored as a comma-separated string must be split into a list."""
    sc = SkillCategory.model_validate({"category": "Languages", "items": "Python, SQL, Go"})
    assert sc.items == ["Python", "SQL", "Go"]


def test_experience_achievements_newline_coercion():
    """achievements stored as a newline-delimited string must become a list."""
    data = {
        "company": "Acme",
        "position": "Engineer",
        "duration": "2022-2024",
        "achievements": "Built pipelines.\nReduced latency by 40%.",
    }
    exp = Experience.model_validate(data)
    assert exp.achievements == ["Built pipelines.", "Reduced latency by 40%."]


def test_project_description_multiline_string_coercion():
    """description stored as a newline-delimited string must become a list."""
    data = {
        "name": "My Project",
        "year": "2023",
        "technologies": "Python",
        "description": "Line one.\nLine two.",
    }
    proj = Project.model_validate(data)
    assert proj.description == ["Line one.", "Line two."]


def test_library_project_source_field():
    """LibraryProject inherits Project and adds a source filename field."""
    data = {
        "name": "ETL Pipeline",
        "year": "2024",
        "technologies": "Spark, Kafka",
        "description": ["Processed 1M events/day."],
        "source": "python-data-engineer.json",
    }
    lp = LibraryProject.model_validate(data)
    assert lp.name == "ETL Pipeline"
    assert lp.source == "python-data-engineer.json"
    assert lp.tech_stack == "Spark, Kafka"


def test_award_description_alias():
    """Award.date accepts 'description' as an alias (legacy JSON key)."""
    data = {"title": "AWS Certified", "description": "Professional level"}
    award = Award.model_validate(data)
    assert award.title == "AWS Certified"
    assert award.date == "Professional level"


def test_resume_data_skills_list_format():
    """skills as a plain list of {category, items} objects (non-legacy path)."""
    data = {
        "skills": [
            {"category": "Cloud", "items": ["AWS", "GCP"]},
            {"category": "Languages", "items": ["Python"]},
        ]
    }
    resume = ResumeData.model_validate(data)
    assert len(resume.skills) == 2
    assert resume.skills[0].category == "Cloud"
    assert "AWS" in resume.skills[0].items
    assert resume.skills[1].category == "Languages"
    assert resume.skills[1].items == ["Python"]
