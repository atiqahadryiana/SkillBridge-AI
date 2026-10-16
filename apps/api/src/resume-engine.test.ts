import { describe, expect, it } from 'vitest';
import { analyzeJobAlignment, analyzeReadiness, detectSections, extractSkills } from './resume-engine.js';

const taxonomy = [
  { name: 'JavaScript', aliases: 'JS' }, { name: 'Python', aliases: '' },
  { name: 'SQL', aliases: '' }, { name: 'Power BI', aliases: 'PowerBI' },
  { name: 'Communication', aliases: '' },
];
const resume = `Aina Rahman\naina@example.com | +6012-3456789 | github.com/aina\n\nProfessional Summary\nFresh graduate focused on responsible data analysis.\n\nSkills\nPython, SQL, Communication\n\nEducation\nBachelor of Information Technology 2026\n\nProjects\n- Built a Python and SQL dashboard for a university project.\n- Presented findings and documented data limitations.\n- Collaborated with four peers using Git.`;

describe('resume intelligence engine', () => {
  it('recognizes flexible headings and skills', () => {
    expect(detectSections(resume).projects).toContain('dashboard');
    expect(extractSkills('Built with JS and Python', taxonomy)).toEqual(['JavaScript', 'Python']);
  });
  it('calculates bounded, explainable readiness', () => {
    const result = analyzeReadiness(resume, taxonomy);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveLength(5);
    expect(result.skills).toContain('Python');
  });
  it('separates missing skills from evidence-supported skills', () => {
    const result = analyzeJobAlignment({ text: resume, required: ['Python','SQL','Power BI'], preferred: [], jobText: 'Build Python SQL and Power BI reports', taxonomy });
    expect(result.matchedRequired).toEqual(['Python','SQL']);
    expect(result.supported).toEqual(expect.arrayContaining(['Python','SQL']));
    expect(result.missing).toEqual(['Power BI']);
  });
  it('redistributes a non-applicable preferred-skills weight', () => {
    const result = analyzeJobAlignment({ text: resume, required: ['Python'], preferred: [], jobText: 'Use Python for analysis', taxonomy });
    expect(result.breakdown.find((x) => x.key === 'preferred')).toBeUndefined();
    expect(Math.round(result.breakdown.reduce((n, x) => n + x.weight, 0))).toBe(100);
  });
});
