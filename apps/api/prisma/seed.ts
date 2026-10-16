import "dotenv/config";
import { PrismaClient, Level, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeSkill } from "@skillbridge/shared";
const p = new PrismaClient();
const taxonomy = [
  ["JavaScript", "Programming", "JS"],
  ["TypeScript", "Programming", "TS"],
  ["Python", "Programming", ""],
  ["Java", "Programming", ""],
  ["C#", "Programming", ""],
  ["React", "Web Development", ""],
  ["Node.js", "Web Development", "NodeJS"],
  ["HTML", "Web Development", ""],
  ["CSS", "Web Development", ""],
  ["SQL", "Data Analytics", ""],
  ["PostgreSQL", "Data Analytics", "Postgres"],
  ["MongoDB", "Data Analytics", ""],
  ["Excel", "Data Analytics", ""],
  ["Data Visualization", "Data Analytics", ""],
  ["Power BI", "Data Analytics", "PowerBI"],
  ["Tableau", "Data Analytics", ""],
  ["Machine Learning", "Artificial Intelligence", "ML"],
  ["TensorFlow", "Artificial Intelligence", ""],
  ["Natural Language Processing", "Artificial Intelligence", "NLP"],
  ["Git", "Programming", ""],
  ["Docker", "Cloud Computing", ""],
  ["Kubernetes", "Cloud Computing", ""],
  ["AWS", "Cloud Computing", ""],
  ["Azure", "Cloud Computing", ""],
  ["Linux", "Networking", ""],
  ["Networking", "Networking", ""],
  ["Cybersecurity", "Cybersecurity", ""],
  ["Penetration Testing", "Cybersecurity", ""],
  ["REST APIs", "Web Development", ""],
  ["Express.js", "Web Development", ""],
  ["Next.js", "Web Development", ""],
  ["Vue.js", "Web Development", ""],
  ["React Native", "Mobile Development", ""],
  ["Flutter", "Mobile Development", ""],
  ["Figma", "Design", ""],
  ["UI/UX Design", "Design", "UI UX"],
  ["User Research", "Design", ""],
  ["QA Testing", "Programming", ""],
  ["Test Automation", "Programming", ""],
  ["CI/CD", "Cloud Computing", ""],
  ["DevOps", "Cloud Computing", ""],
  ["Agile", "Project Management", ""],
  ["Scrum", "Project Management", ""],
  ["Project Planning", "Project Management", ""],
  ["Communication", "Communication", ""],
  ["Presentation", "Communication", ""],
  ["Technical Writing", "Communication", ""],
  ["Leadership", "Leadership", ""],
  ["Teamwork", "Communication", ""],
  ["Problem Solving", "Problem Solving", ""],
  ["Critical Thinking", "Problem Solving", ""],
  ["Business Analysis", "Business and Marketing", ""],
  ["Requirements Gathering", "Business and Marketing", ""],
  ["Digital Marketing", "Business and Marketing", ""],
  ["SEO", "Business and Marketing", ""],
  ["Data Structures", "Programming", ""],
  ["Algorithms", "Programming", ""],
  ["Database Design", "Data Analytics", ""],
  ["Cloud Architecture", "Cloud Computing", ""],
  ["IT Support", "Networking", ""],
  ["Troubleshooting", "Problem Solving", ""],
  ["Wireframing", "Design", ""],
  ["Prototyping", "Design", ""],
  ["Android", "Mobile Development", ""],
  ["iOS", "Mobile Development", ""],
];
const jobs = [
  [
    "Junior Data Analyst",
    "Data & Analytics",
    "Kuala Lumpur",
    "HYBRID",
    ["Python", "SQL", "Excel", "Data Visualization"],
    ["Power BI", "Machine Learning"],
  ],
  [
    "Frontend Developer",
    "Technology",
    "Kuala Lumpur",
    "HYBRID",
    ["JavaScript", "React", "HTML", "CSS"],
    ["TypeScript", "Figma"],
  ],
  [
    "Backend Developer",
    "Technology",
    "Cyberjaya",
    "HYBRID",
    ["Node.js", "SQL", "REST APIs", "Git"],
    ["TypeScript", "Docker"],
  ],
  [
    "Full Stack Developer",
    "Technology",
    "Penang",
    "REMOTE",
    ["JavaScript", "React", "Node.js", "SQL"],
    ["TypeScript", "AWS"],
  ],
  [
    "Software Engineer",
    "Technology",
    "Johor Bahru",
    "ONSITE",
    ["Java", "SQL", "Git", "Problem Solving"],
    ["Docker", "Agile"],
  ],
  [
    "Data Scientist",
    "Data & Analytics",
    "Kuala Lumpur",
    "HYBRID",
    ["Python", "SQL", "Machine Learning", "Data Visualization"],
    ["TensorFlow", "AWS"],
  ],
  [
    "AI Engineer",
    "Artificial Intelligence",
    "Cyberjaya",
    "HYBRID",
    ["Python", "Machine Learning", "REST APIs", "Git"],
    ["TensorFlow", "NLP"],
  ],
  [
    "Machine Learning Engineer",
    "Artificial Intelligence",
    "Kuala Lumpur",
    "REMOTE",
    ["Python", "Machine Learning", "Algorithms", "Docker"],
    ["TensorFlow", "AWS"],
  ],
  [
    "Cybersecurity Analyst",
    "Cybersecurity",
    "Putrajaya",
    "ONSITE",
    ["Cybersecurity", "Networking", "Linux", "Problem Solving"],
    ["Penetration Testing", "Python"],
  ],
  [
    "Network Engineer",
    "Telecommunications",
    "Shah Alam",
    "ONSITE",
    ["Networking", "Linux", "Troubleshooting", "Communication"],
    ["Cybersecurity", "AWS"],
  ],
  [
    "Cloud Engineer",
    "Cloud Computing",
    "Kuala Lumpur",
    "HYBRID",
    ["AWS", "Linux", "Docker", "Networking"],
    ["Kubernetes", "CI/CD"],
  ],
  [
    "UI/UX Designer",
    "Design",
    "Petaling Jaya",
    "HYBRID",
    ["UI/UX Design", "Figma", "Wireframing", "User Research"],
    ["Prototyping", "HTML"],
  ],
  [
    "QA Tester",
    "Technology",
    "Penang",
    "HYBRID",
    ["QA Testing", "Problem Solving", "Technical Writing", "Agile"],
    ["Test Automation", "JavaScript"],
  ],
  [
    "IT Support Specialist",
    "IT Services",
    "Ipoh",
    "ONSITE",
    ["IT Support", "Troubleshooting", "Networking", "Communication"],
    ["Linux", "Cybersecurity"],
  ],
  [
    "Business Analyst",
    "Consulting",
    "Kuala Lumpur",
    "HYBRID",
    [
      "Business Analysis",
      "Requirements Gathering",
      "Communication",
      "Presentation",
    ],
    ["SQL", "Agile"],
  ],
  [
    "Database Administrator",
    "Technology",
    "Cyberjaya",
    "ONSITE",
    ["SQL", "PostgreSQL", "Database Design", "Linux"],
    ["AWS", "Troubleshooting"],
  ],
  [
    "DevOps Engineer",
    "Technology",
    "Kuala Lumpur",
    "REMOTE",
    ["Docker", "CI/CD", "Linux", "Git"],
    ["Kubernetes", "AWS"],
  ],
  [
    "Project Coordinator",
    "Professional Services",
    "Kuala Lumpur",
    "HYBRID",
    ["Project Planning", "Communication", "Agile", "Teamwork"],
    ["Scrum", "Leadership"],
  ],
  [
    "Digital Marketing Analyst",
    "Marketing",
    "Petaling Jaya",
    "HYBRID",
    ["Digital Marketing", "Data Visualization", "Excel", "Communication"],
    ["SEO", "Power BI"],
  ],
  [
    "Mobile App Developer",
    "Technology",
    "Johor Bahru",
    "REMOTE",
    ["React Native", "JavaScript", "Git", "REST APIs"],
    ["TypeScript", "Android"],
  ],
] as const;
async function main() {
  await p.resumeSuggestion.deleteMany();
  await p.resumeJobMatch.deleteMany();
  await p.resumeAnalysis.deleteMany();
  await p.resume.deleteMany();
  await p.learningProgress.deleteMany();
  await p.savedJob.deleteMany();
  await p.application.deleteMany();
  await p.jobSkill.deleteMany();
  await p.job.deleteMany();
  await p.candidateSkill.deleteMany();
  await p.learningResource.deleteMany();
  await p.skill.deleteMany();
  await p.candidate.deleteMany();
  await p.employer.deleteMany();
  await p.user.deleteMany();
  for (const [name, category, aliases] of taxonomy)
    await p.skill.create({
      data: { name, category, aliases, normalized: normalizeSkill(name) },
    });
  const hash = await bcrypt.hash("Demo123!", 12);
  const candidate = await p.user.create({
    data: {
      name: "Aina Rahman",
      email: "candidate@skillbridge.demo",
      passwordHash: hash,
      role: Role.CANDIDATE,
      candidate: {
        create: {
          headline: "Fresh graduate exploring data careers",
          location: "Kuala Lumpur",
          preferredRoles: "Data Analyst",
          preferredLocations: "Kuala Lumpur",
          arrangements: "HYBRID,REMOTE",
          discoverable: true,
        },
      },
    },
    include: { candidate: true },
  });
  const employer = await p.user.create({
    data: {
      name: "Daniel Lim",
      email: "employer@skillbridge.demo",
      passwordHash: hash,
      role: Role.EMPLOYER,
      employer: {
        create: {
          companyName: "Nusa Digital Labs",
          industry: "Technology",
          description:
            "Fictional Malaysian technology studio used for demonstration.",
        },
      },
    },
    include: { employer: true },
  });
  await p.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@skillbridge.demo",
      passwordHash: hash,
      role: Role.ADMIN,
    },
  });
  for (const [name, level] of [
    ["Python", Level.ADVANCED],
    ["SQL", Level.INTERMEDIATE],
    ["Machine Learning", Level.INTERMEDIATE],
    ["Communication", Level.ADVANCED],
  ] as const) {
    const s = await p.skill.findUniqueOrThrow({
      where: { normalized: normalizeSkill(name) },
    });
    await p.candidateSkill.create({
      data: {
        candidateId: candidate.candidate!.id,
        skillId: s.id,
        level,
        evidenceType: "Self-assessment",
      },
    });
  }
  for (const [
    title,
    industry,
    location,
    arrangement,
    required,
    preferred,
  ] of jobs) {
    const job = await p.job.create({
      data: {
        employerId: employer.employer!.id,
        title,
        industry,
        location,
        arrangement,
        employmentType: "Full-time",
        salary: "RM 3,500 – RM 6,500",
        description: `Join a fictional demonstration employer in a ${title} role. Collaborate with a supportive team, solve practical problems, and grow through structured feedback. This is seeded prototype data, not a live vacancy.`,
        deadline: new Date("2027-03-31"),
      },
    });
    for (const name of required) {
      const s = await p.skill.findUniqueOrThrow({
        where: { normalized: normalizeSkill(name) },
      });
      await p.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: s.id,
          required: true,
          level: Level.INTERMEDIATE,
        },
      });
    }
    for (const name of preferred) {
      const s = await p.skill.findUniqueOrThrow({
        where: { normalized: normalizeSkill(name) },
      });
      await p.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: s.id,
          required: false,
          level: Level.BEGINNER,
        },
      });
    }
  }
  const resources = [
    [
      "Python for Everybody",
      "freeCodeCamp",
      "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
      "Python",
    ],
    [
      "Query relational data in SQL",
      "Microsoft Learn",
      "https://learn.microsoft.com/en-us/training/paths/get-started-querying-with-transact-sql/",
      "SQL",
    ],
    [
      "Data Analysis with Python",
      "freeCodeCamp",
      "https://www.freecodecamp.org/learn/data-analysis-with-python/",
      "Data Visualization",
    ],
    [
      "Get started with Power BI",
      "Microsoft Learn",
      "https://learn.microsoft.com/en-us/training/paths/get-started-power-bi/",
      "Power BI",
    ],
    [
      "Machine Learning for Beginners",
      "Microsoft Learn",
      "https://learn.microsoft.com/en-us/training/paths/machine-learning-foundations-using-data-science/",
      "Machine Learning",
    ],
    [
      "Responsive Web Design",
      "freeCodeCamp",
      "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
      "CSS",
    ],
    [
      "JavaScript Algorithms",
      "freeCodeCamp",
      "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
      "JavaScript",
    ],
    [
      "React learning path",
      "Microsoft Learn",
      "https://learn.microsoft.com/en-us/training/paths/react/",
      "React",
    ],
    [
      "AWS Cloud Practitioner Essentials",
      "AWS Skill Builder",
      "https://explore.skillbuilder.aws/learn/course/134/aws-cloud-practitioner-essentials",
      "AWS",
    ],
    [
      "Introduction to cybersecurity",
      "Cisco Networking Academy",
      "https://www.netacad.com/courses/introduction-to-cybersecurity",
      "Cybersecurity",
    ],
  ];
  for (let i = 0; i < 20; i++) {
    const [t, provider, url, skillName] = resources[i % resources.length];
    const s = await p.skill.findUniqueOrThrow({
      where: { normalized: normalizeSkill(skillName) },
    });
    await p.learningResource.create({
      data: {
        title: i < 10 ? t : `${t} — practice`,
        provider,
        url,
        skillId: s.id,
      },
    });
  }
  console.log(
    "Seeded demo accounts, 65 skills, 20 jobs and 20 learning resources.",
  );
}
main().finally(() => p.$disconnect());
