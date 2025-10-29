export const enum GlobalConstants {
    APP_BASE_TITLE = "Marketing Freelancer Tool",
}

export const enum Prompts {
    GENERATE_SKILLS = `You are to generate a JSON object for a tech stack skill to be used as an API body for my SkillModel in Sequelize.

Follow these exact rules:

2. Add the following fields:
   - 'title': The name of the technology (e.g., "React", "Node.js", etc.)
   - 'url': The official website of that tech stack.
   - 'variation': An array of all possible name variations or aliases used on job sites. Example for React: '["React", "React.js", "ReactJS", "React JS"]'.
   - 'icon': SVG icons URL of that tech stack from 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/' (for example: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/[iconname].svg').
   


Return **only** a single clean JSON object, properly formatted (no markdown or explanations).

Notes: 
- Only return JSON, nothing else. 
- I want to post it directly to my API as the request body.

Example Input:
React

Example Output:
{
  "title": "React",
  "url": "https://react.dev",
  "variation": ["React", "React.js", "ReactJS", "React JS"],
  "icon": "cdn.jsdelivr.net/npm/simple-icons@latest/icons/react-original.svg",
  }

Now generate this JSON for the following tech stack:
{skill_name}`,

    SKILL_GROUP = `You are an assistant helping me generate JSON data for my CV API. I am a web developer and I want to create content for the tech stack Angular. 

Generate the JSON object following these rules:

1. Include these fields:
      - description: A generic description (100–200 characters) for the tech stack like what skills I have in the tech stack. talk about me. Don't Mention other teck stack because the purpose of this writing just to target one tech stack. Important keywords must be wrapped in <u> tags.
   - skills_ids: Hard-coded as object like where skill_id is a variable which later be replaced by {
        "skills_ids": [
            "{skill_id}"
        ]
    }
   - experience_variation1 to experience_variation10: 10 different descriptions of what I have done using <u>tech stack</u>. Focus on practical use cases and distinct tasks/projects. Important keywords wrapped in <u> tags. Do not start with "I" or "we". Keep them concise, 100–200 characters.Don't mention any other tech stack
   - portfolio_variation1 to portfolio_variation10: 10 different generic project module descriptions (like <u>authentication</u>, <u>payment integration</u>, <u>dashboard</u>, <u>form validation</u>, <u>API integration</u>, etc.) done with <u>tech stack</u>. Important keywords wrapped in <u> tags. Each description should be 100–200 characters. Don't mention any other tech stack
   - main_profile_id : hard coded as {main_profile_id}
   - label:  name of the tech stack

2. Output the result strictly as **JSON**, ready to be used as the API body. Do not include any markdown, explanation, or extra text.  

3. Example format (replace example text with Angular content):

{
  "description": "Generic description about Angular and related tech like <u>TypeScript</u>, <u>RxJS</u>, <u>NgRx</u>.",
  "skills_ids": {"skills_ids":["skill_id"]}",
  "experience_variation1": "Experience 1 description using <u>Angular</u>.",
  "experience_variation2": "Experience 2 description using <u>Angular</u>.",
  "experience_variation3": "Experience 3 description using <u>Angular</u>.",
  ...
  "experience_variation10": "Experience 10 description using <u>Angular</u>.",
  "portfolio_variations": {
    "portfolio_variation1": "Portfolio 1 module description using <u>Angular</u>.",
    "portfolio_variation2": "Portfolio 2 module description using <u>Angular</u>.",
    ...
    "portfolio_variation10": "Portfolio 10 module description using <u>Angular</u>."
  }
}

Now generate this JSON for the following tech stack:
{skill_name}
`,
}