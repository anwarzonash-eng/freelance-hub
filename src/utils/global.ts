export const enum GlobalConstants {
  APP_BASE_TITLE = "Marketing Freelancer Tool",
}

export const enum Prompts {
  GENERATE_SKILLS = `You are to generate JSON data for tech stack skills to be used as an API body for my SkillModel in Sequelize.

Follow these exact rules:

1. If the input contains ONLY ONE skill name, return a single JSON object.
2. If the input contains MULTIPLE skill names (comma-separated), return an array of JSON objects.

3. Each object must have the following fields:
   - 'title': The name of the technology (e.g., "React", "Node.js", etc.)
   - 'url': The official website of that tech stack.
   - 'variation': An array of all possible name variations or aliases used on job sites. Example for React: '["React", "React.js", "ReactJS", "React JS"]'.
   - 'icon': SVG icons URL of that tech stack from 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/' (for example: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/[iconname].svg').

Return **only** clean JSON (object or array), properly formatted (no markdown or explanations).

Notes: 
- Only return JSON, nothing else. 
- I want to post it directly to my API as the request body.

Example Input (Single):
React

Example Output (Single):
{
  "title": "React",
  "url": "https://react.dev",
  "variation": ["React", "React.js", "ReactJS", "React JS"],
  "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg"
}

Example Input (Multiple):
React, Vue.js, Angular

Example Output (Multiple):
[
  {
    "title": "React",
    "url": "https://react.dev",
    "variation": ["React", "React.js", "ReactJS", "React JS"],
    "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg"
  },
  {
    "title": "Vue.js",
    "url": "https://vuejs.org",
    "variation": ["Vue", "Vue.js", "VueJS", "Vue JS"],
    "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/vuedotjs.svg"
  },
  {
    "title": "Angular",
    "url": "https://angular.io",
    "variation": ["Angular", "AngularJS", "Angular JS"],
    "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/angular.svg"
  }
]

Now generate this JSON for the following tech stack(s):
{skill_name}`,

  SKILL_GROUP = `You are an assistant helping me generate JSON data for my CV API. This module creates Skill Groups (Dynamic Generations), one per skill.

Follow these exact rules:

1. If the input contains ONLY ONE skill name, return a single JSON object.
2. If the input contains MULTIPLE skill names (comma-separated), return an array of JSON objects.

3. Each object must include these fields:
   - description: 100–200 characters about expertise in the specific <u>skill</u>. Do not mention other tech stacks. Wrap important keywords in <u> tags.
   - skills_ids: Hard-coded as {"skills_ids": ["{skill_id}"]} where {skill_id} is the provided variable for that skill.
   - experience_variation1 ... experience_variation10: Ten distinct, practical experience lines using ONLY this <u>skill</u>. It should write as a whole experience in that company not specific to very child feature like implement actions in redux instead it should managed complex state management using redux and redux presist. It should be at high level. Wrap important keywords in <u> tags.100–150 characters each. No "I" or "we". Wrap important keywords in <u> tags.
   - portfolio_variations: Object with keys portfolio_variation1 ... portfolio_variation10, It should write as a whole portfolio experience in that project not specific to very child feature like implement actions in redux instead it should managed complex state management using redux and redux presist. It should be at high level. each 100–150 character module description using ONLY this <u>skill</u> (e.g., <u>authentication</u>, <u>payment integration</u>, <u>forms</u>, <u>API integration</u>). Use <u> tags for keywords.
   - main_profile_id: Hard-coded as {main_profile_id}.
   - label: The skill name in a short label format.

4. Output strictly JSON (object or array). No markdown or explanations.

Example Output (Single):
{
  "description": "Short description focused on <u>Angular</u> expertise...",
  "skills_ids": { "skills_ids": ["{skill_id}"] },
  "experience_variation1": "Built <u>SPA</u> routing with <u>Angular Router</u>...",
  "experience_variation2": "Configured <u>RxJS</u> streams for <u>state</u>...",
  "experience_variation3": "...",
  "experience_variation10": "...",
  "portfolio_variations": {
    "portfolio_variation1": "Implemented <u>authentication</u> flow...",
    "portfolio_variation2": "Built <u>dashboard</u> analytics...",
    "portfolio_variation10": "..."
  },
  "main_profile_id": "{main_profile_id}",
  "label": "Angular"
}

Example Output (Multiple):
[
  { "description": "...React...", "skills_ids": {"skills_ids":["{skill_id}"]}, "experience_variation1": "...", "experience_variation10": "...", "portfolio_variations": {"portfolio_variation1":"...","portfolio_variation10":"..."}, "main_profile_id": "{main_profile_id}", "label": "React" },
  { "description": "...Vue.js...", "skills_ids": {"skills_ids":["{skill_id}"]}, "experience_variation1": "...", "experience_variation10": "...", "portfolio_variations": {"portfolio_variation1":"...","portfolio_variation10":"..."}, "main_profile_id": "{main_profile_id}", "label": "Vue.js" }
]

Now generate this JSON for the following skill(s):
{skill_name}
`,
  CATEGORY = `You are to generate JSON data for IT services/categories like Node.js Developer, Web Developer, Mobile App Developer, etc. This is for my full stack developer website to showcase skills, portfolios, and services.

Follow these exact rules:

1. If the input contains ONLY ONE service/category name, return a single JSON object.
2. If the input contains MULTIPLE service/category names (comma-separated), return an array of JSON objects.

3. Each object must have the following fields:
   - 'title': The name of the service (e.g., "Node.js Developer", "React Developer", etc.)
   - 'designation': A professional designation similar to the service name (e.g., "Senior Node.js Developer")
   - 'label': A private label identifier for the service (lowercase, hyphenated version of title)
   - 'tagline': A single line tagline explaining what you can do for this service (short and precise)
   - 'intro_heading': A heading for the introduction section (e.g., "Expert Node.js Development Services")
   - 'intro': A brief HTML introduction paragraph about the service (100-150 words) with important keywords wrapped in <u> tags
   - 'mainIntro_heading': A heading for the main introduction (e.g., "Why Choose Me for Node.js Development")
   - 'mainIntro': A detailed HTML description (200-300 words) highlighting expertise, with keywords in <u> tags. 
   - 'short_description': A short HTML summary (50-100 words) with keywords in <u> tags
   - 'skills_ids': Hard-coded as {"skills_ids": []}
   - 'main_profile_id': Hard-coded as {main_profile_id}
   - 'thumbnail': SVG icon URL from 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/[iconname].svg'
   - 'experience_intro': An object with keys intro1 to intro10, Each version must:
		  - Be written in first person.
		  - Be limited to 2–3 lines maximum.
		  - Include both \${designation} and \${Company_name} naturally within the sentence (do NOT start with "As a").
		  - Focus on responsibilities, technologies used, contributions, and measurable impact.
		  - Highlight key technical skills, tools, or methodologies using <u> tags>.
		  - Sound like a real work experience entry, not a generic bio.
		  - Vary sentence structure and phrasing across all 10 versions.
      - put \${designation} and \${Company_name} at different positions randomly

		  Keep each version professional, achievement-driven, and dynamic based on the provided role and company.
		  Return only the 10 HTML-formatted summaries.

   - 'experience_titles': An object with keys title1 to title10. Generate 10 unique Job Titles based on the service name, arranged from highest seniority (Lead/Senior) to lowest experience (Junior/Associate). Ensure a natural career progression.
Return **only** clean JSON (object or array), properly formatted (no markdown or explanations).

Notes: 
- Only return JSON, nothing else. 
- I want to post it directly to my API as the request body.

Example Input (Single):
React Developer

Example Output (Single):
{
    "label": "react-developer",
    "title": "React Developer",
    "designation": "Senior React Developer",
    "tagline": "Building modern, responsive web applications with React.js",
    "intro_heading": "Expert React Development Services",
    "intro": "<p>Specializing in <u>React.js</u> development with expertise in <u>component-based architecture</u>, <u>hooks</u>, and <u>state management</u>.</p>",
    "mainIntro_heading": "Why Choose Me for React Development",
    "mainIntro": "<p>With years of experience in <u>React</u> development, I deliver high-quality, scalable applications using <u>modern JavaScript</u>, <u>TypeScript</u>, and <u>Redux</u>.</p>",
    "short_description": "<p>Professional <u>React developer</u> creating dynamic, user-friendly web applications.</p>",
    "thumbnail": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg",
    "skills_ids": {
        "skills_ids": []
    },
    "main_profile_id": "{main_profile_id}",
    "experience_intro": {
    "intro1": "<p>At \${Company_name}, my role as \${designation} involved building robust <u>RESTful APIs</u> with <u>Express.js</u> to support scalable applications.</p>",
    "intro2": "<p>Designed and implemented a <u>microservices architecture</u> to improve modularity and performance across projects at \${Company_name} as \${designation}.</p>",
    "intro3": "<p>Led development of <u>real-time applications</u> using <u>WebSockets</u> and <u>Node.js</u> while working as \${designation} at \${Company_name}.</p>",
    "intro4": "<p>Integrated complex <u>database systems</u> and optimized queries to enhance efficiency as \${designation} at \${Company_name}.</p>",
    "intro5": "<p>Built secure <u>authentication</u> and <u>authorization systems</u> to safeguard user data, contributing as \${designation} at \${Company_name}.</p>",
    "intro6": "<p>Developed <u>payment processing</u> workflows and integrated APIs to streamline transactions in my role as \${designation} at \${Company_name}.</p>",
    "intro7": "<p>Created <u>cloud-based solutions</u> with scalable infrastructure, ensuring high availability while serving as \${designation} at \${Company_name}.</p>",
    "intro8": "<p>Implemented effective <u>caching strategies</u> to enhance performance and reduce load times as \${designation} at \${Company_name}.</p>",
    "intro9": "<p>Built <u>file upload</u> and management systems with error handling and security measures, contributing as \${designation} at \${Company_name}.</p>",
    "intro10": "<p>Designed and deployed <u>email notification services</u> for better user engagement in my capacity as \${designation} at \${Company_name}.</p>"
}
    "experience_titles": { "title1": "Lead React Developer", "title2": "Senior React Engineer", "title3": "Senior React Developer", "title4": "React Software Engineer", "title5": "React Developer", "title6": "Web Developer (React)", "title7": "Frontend React Developer", "title8": "Associate React Developer", "title9": "Junior React Engineer", "title10": "Junior React Developer" }
}

Example Input (Multiple):
React Developer, Node.js Developer

Example Output (Multiple):
[
  {
    "label": "react-developer",
    "title": "React Developer",
    "designation": "Senior React Developer",
    "tagline": "Building modern, responsive web applications with React.js",
    "intro_heading": "Expert React Development Services",
    "intro": "<p>Specializing in <u>React.js</u> development...</p>",
    "mainIntro_heading": "Why Choose Me for React Development",
    "mainIntro": "<p>With years of experience...</p>",
    "short_description": "<p>Professional <u>React developer</u>...</p>",
    "thumbnail": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg",
    "skills_ids": {"skills_ids": []},
    "main_profile_id": "{main_profile_id}",
   "experience_intro": {
    "intro1": "<p>At \${Company_name}, my role as \${designation} involved building robust <u>RESTful APIs</u> with <u>Express.js</u> to support scalable applications.</p>",
    "intro2": "<p>Designed and implemented a <u>microservices architecture</u> to improve modularity and performance across projects at \${Company_name} as \${designation}.</p>",
    "intro3": "<p>Led development of <u>real-time applications</u> using <u>WebSockets</u> and <u>Node.js</u> while working as \${designation} at \${Company_name}.</p>",
    "intro4": "<p>Integrated complex <u>database systems</u> and optimized queries to enhance efficiency as \${designation} at \${Company_name}.</p>",
    "intro5": "<p>Built secure <u>authentication</u> and <u>authorization systems</u> to safeguard user data, contributing as \${designation} at \${Company_name}.</p>",
    "intro6": "<p>Developed <u>payment processing</u> workflows and integrated APIs to streamline transactions in my role as \${designation} at \${Company_name}.</p>",
    "intro7": "<p>Created <u>cloud-based solutions</u> with scalable infrastructure, ensuring high availability while serving as \${designation} at \${Company_name}.</p>",
    "intro8": "<p>Implemented effective <u>caching strategies</u> to enhance performance and reduce load times as \${designation} at \${Company_name}.</p>",
    "intro9": "<p>Built <u>file upload</u> and management systems with error handling and security measures, contributing as \${designation} at \${Company_name}.</p>",
    "intro10": "<p>Designed and deployed <u>email notification services</u> for better user engagement in my capacity as \${designation} at \${Company_name}.</p>"
}
    "experience_titles": { "title1": "Lead React Developer", "title2": "Senior React Engineer", "title3": "Senior React Developer", "title4": "React Software Engineer", "title5": "React Developer", "title6": "Web Developer (React)", "title7": "Frontend React Developer", "title8": "Associate React Developer", "title9": "Junior React Engineer", "title10": "Junior React Developer" }
  },
  {
    "label": "nodejs-developer",
    "title": "Node.js Developer",
    "designation": "Senior Node.js Developer",
    "tagline": "Creating scalable backend solutions with Node.js",
    "intro_heading": "Expert Node.js Development Services",
    "intro": "<p>Specializing in <u>Node.js</u> backend development...</p>",
    "mainIntro_heading": "Why Choose Me for Node.js Development",
    "mainIntro": "<p>With extensive experience in <u>Node.js</u>...</p>",
    "short_description": "<p>Professional <u>Node.js developer</u>...</p>",
    "thumbnail": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/nodedotjs.svg",
    "skills_ids": {"skills_ids": []},
    "main_profile_id": "{main_profile_id}",
   "experience_intro": {
     "intro1": "<p>At \${Company_name}, my role as \${designation} involved building robust <u>RESTful APIs</u> with <u>Express.js</u> to support scalable applications.</p>",
    "intro2": "<p>Designed and implemented a <u>microservices architecture</u> to improve modularity and performance across projects at \${Company_name} as \${designation}.</p>",
    "intro3": "<p>Led development of <u>real-time applications</u> using <u>WebSockets</u> and <u>Node.js</u> while working as \${designation} at \${Company_name}.</p>",
    "intro4": "<p>Integrated complex <u>database systems</u> and optimized queries to enhance efficiency as \${designation} at \${Company_name}.</p>",
    "intro5": "<p>Built secure <u>authentication</u> and <u>authorization systems</u> to safeguard user data, contributing as \${designation} at \${Company_name}.</p>",
    "intro6": "<p>Developed <u>payment processing</u> workflows and integrated APIs to streamline transactions in my role as \${designation} at \${Company_name}.</p>",
    "intro7": "<p>Created <u>cloud-based solutions</u> with scalable infrastructure, ensuring high availability while serving as \${designation} at \${Company_name}.</p>",
    "intro8": "<p>Implemented effective <u>caching strategies</u> to enhance performance and reduce load times as \${designation} at \${Company_name}.</p>",
    "intro9": "<p>Built <u>file upload</u> and management systems with error handling and security measures, contributing as \${designation} at \${Company_name}.</p>",
    "intro10": "<p>Designed and deployed <u>email notification services</u> for better user engagement in my capacity as \${designation} at \${Company_name}.</p>"
}
    "experience_titles": { "title1": "Lead React Developer", "title2": "Senior React Engineer", "title3": "Senior React Developer", "title4": "React Software Engineer", "title5": "React Developer", "title6": "Web Developer (React)", "title7": "Frontend React Developer", "title8": "Associate React Developer", "title9": "Junior React Engineer", "title10": "Junior React Developer" }

  }
]

Now generate this JSON for the following service(s):
{service_name}
`,
  GENERATE_SUGGESTED_SKILLS = `Role: You are a Technical Recruitment Analyst.

Task: Analyze the following linkedIn job posting text which includes the Title, Description, and Employer Skills list. Extract and suggest key professional attributes for a Full Stack Developer.

Input Text: {job_description}

Instructions:

tech_stack_required: List all hard or we can say true tech stacks skills, languages, and frameworks explicitly mentioned. Only Names no description.

soft_skills_required: Identify professional qualities only give me. Only Names no description.

suggested_tech_stack: Based on the "Title" and "Description," what common technologies are missing but likely needed? (e.g., if it's a Next.js role, suggest Tailwind CSS or Vercel). Only Names no description.

suggested_soft_skills: Based on the tone of the "Description," what trait is most valuable? (e.g., if it's a contract for an urgent fix, suggest "Speed and Efficiency"). Only Names no description

Expected Output Format:

Tech Stack Required
(List keywords found in the "Skills" or "Description" sections)

Soft Skills Required
(List professional qualities found anywhere in the text)

Suggested Tech Stack
(List technologies that usually go with the required stack but weren't mentioned)

Suggested Soft Skills
(List the most valuable traits based on the job context, e.g., "Fast Delivery" or "Self-Management")
`,
  GENERATE_SUMMARY_DESCRIPTION_SKILLS = `Role: You are a specialized Technical Career Strategist for high-end Software Professionals.

--- CONFIGURATION ---
Job Type: {job_type}
Include Years of Experience: {Yes/No}
Years of Experience: {years_of_experience}
---------------------

Goal: 
- Generate a 3-sentence "Professional Summary" for a CV.
- Generate a 3-4 word "Designation."
- Generate a 10-15 word "tagline."

--- Input Data ---
Job Details(Title, Description, Skills Listed by Employer): 

{job_description}

---------------------


Writing Rules (Strict):

1. The Experience Rule: 
   - If "Include Years of Experience" is Yes: Sentence 1 MUST start with "I am a [Job Title] with [X] years of experience..."
   - If "Include Years of Experience" is No: Sentence 1 MUST focus on "Expertise" or "Specialization" without mentioning a number.

2. Job-Type Logic (Apply based on Configuration):
   - IF CONTRACT: Focus on "immediate impact," "hitting the ground running," and "technical execution." Use a "Service Provider" tone.
   - IF FREELANCE: Focus on "end-to-end delivery," "ownership," and "business outcomes." Use a "Technical Partner" tone.
   - IF FULL-TIME: Focus on "long-term scalability," "team collaboration," and "contributing to the product roadmap." Use a "Company Member" tone.

3. Structure: 
   - Sentence 1: Connection to the Job Title/Years.
   - Sentence 2: Mention the specific Tech Stack and how it solves the JD's hardest technical problem.
   - Sentence 3: Soft Skill (Contract/Freelance = Communication/Deadlines | Full-time = Mentorship/Collaboration).

Formatting: Return only the summary text, Designation, and tagline. No intro/outro.`
}