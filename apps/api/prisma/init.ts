import "dotenv/config";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";

const configured = (process.env.DATABASE_URL || "file:./dev.db").replace(
  /^file:/,
  "",
);
const dbPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  configured,
);
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS User (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS Candidate (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL UNIQUE, headline TEXT, location TEXT, bio TEXT, discoverable INTEGER NOT NULL DEFAULT 0, preferredRoles TEXT NOT NULL DEFAULT '', preferredLocations TEXT NOT NULL DEFAULT '', arrangements TEXT NOT NULL DEFAULT '', FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Employer (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL UNIQUE, companyName TEXT NOT NULL, industry TEXT NOT NULL, description TEXT NOT NULL, FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Skill (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, normalized TEXT NOT NULL UNIQUE, category TEXT NOT NULL, aliases TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS CandidateSkill (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, skillId INTEGER NOT NULL, level TEXT NOT NULL, evidenceType TEXT, evidenceUrl TEXT, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE, FOREIGN KEY(skillId) REFERENCES Skill(id), UNIQUE(candidateId,skillId));
CREATE TABLE IF NOT EXISTS Job (id INTEGER PRIMARY KEY AUTOINCREMENT, employerId INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, location TEXT NOT NULL, arrangement TEXT NOT NULL, employmentType TEXT NOT NULL, industry TEXT NOT NULL, salary TEXT, deadline DATETIME, published INTEGER NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employerId) REFERENCES Employer(id));
CREATE TABLE IF NOT EXISTS JobSkill (id INTEGER PRIMARY KEY AUTOINCREMENT, jobId INTEGER NOT NULL, skillId INTEGER NOT NULL, level TEXT NOT NULL, required INTEGER NOT NULL, FOREIGN KEY(jobId) REFERENCES Job(id) ON DELETE CASCADE, FOREIGN KEY(skillId) REFERENCES Skill(id), UNIQUE(jobId,skillId));
CREATE TABLE IF NOT EXISTS Application (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, jobId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'SUBMITTED', coverNote TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(candidateId) REFERENCES Candidate(id), FOREIGN KEY(jobId) REFERENCES Job(id), UNIQUE(candidateId,jobId));
CREATE TABLE IF NOT EXISTS SavedJob (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, jobId INTEGER NOT NULL, FOREIGN KEY(candidateId) REFERENCES Candidate(id), FOREIGN KEY(jobId) REFERENCES Job(id), UNIQUE(candidateId,jobId));
CREATE TABLE IF NOT EXISTS LearningResource (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, provider TEXT NOT NULL, url TEXT NOT NULL, skillId INTEGER NOT NULL, FOREIGN KEY(skillId) REFERENCES Skill(id));
CREATE TABLE IF NOT EXISTS LearningProgress (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, resourceId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'NOT_STARTED', FOREIGN KEY(candidateId) REFERENCES Candidate(id), FOREIGN KEY(resourceId) REFERENCES LearningResource(id), UNIQUE(candidateId,resourceId));
CREATE TABLE IF NOT EXISTS Resume (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, originalFilename TEXT NOT NULL, mimeType TEXT NOT NULL, storageKey TEXT NOT NULL UNIQUE, fileSize INTEGER NOT NULL, extractedText TEXT NOT NULL, parsingStatus TEXT NOT NULL, uploadedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS Resume_candidateId_uploadedAt_idx ON Resume(candidateId, uploadedAt);
CREATE TABLE IF NOT EXISTS ResumeAnalysis (id INTEGER PRIMARY KEY AUTOINCREMENT, resumeId INTEGER NOT NULL, candidateId INTEGER NOT NULL, readinessScore INTEGER NOT NULL, readinessBreakdown TEXT NOT NULL, extractedSections TEXT NOT NULL, detectedSkills TEXT NOT NULL, parsingIssues TEXT NOT NULL, recommendations TEXT NOT NULL, algorithmVersion TEXT NOT NULL, analyzedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(resumeId) REFERENCES Resume(id) ON DELETE CASCADE, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS ResumeAnalysis_candidateId_analyzedAt_idx ON ResumeAnalysis(candidateId, analyzedAt);
CREATE INDEX IF NOT EXISTS ResumeAnalysis_resumeId_analyzedAt_idx ON ResumeAnalysis(resumeId, analyzedAt);
CREATE TABLE IF NOT EXISTS ResumeJobMatch (id INTEGER PRIMARY KEY AUTOINCREMENT, resumeId INTEGER NOT NULL, candidateId INTEGER NOT NULL, jobId INTEGER, manualJobDescription TEXT, jobTitle TEXT, jobAlignmentScore INTEGER NOT NULL, scoreBreakdown TEXT NOT NULL, matchedSkills TEXT NOT NULL, missingSkills TEXT NOT NULL, recommendations TEXT NOT NULL, algorithmVersion TEXT NOT NULL, analyzedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(resumeId) REFERENCES Resume(id) ON DELETE CASCADE, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE, FOREIGN KEY(jobId) REFERENCES Job(id) ON DELETE SET NULL);
CREATE INDEX IF NOT EXISTS ResumeJobMatch_candidateId_analyzedAt_idx ON ResumeJobMatch(candidateId, analyzedAt);
CREATE INDEX IF NOT EXISTS ResumeJobMatch_resumeId_analyzedAt_idx ON ResumeJobMatch(resumeId, analyzedAt);
CREATE TABLE IF NOT EXISTS ResumeSuggestion (id INTEGER PRIMARY KEY AUTOINCREMENT, analysisId INTEGER NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL, originalText TEXT, suggestedText TEXT, explanation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', FOREIGN KEY(analysisId) REFERENCES ResumeAnalysis(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS ResumeSuggestion_analysisId_status_idx ON ResumeSuggestion(analysisId, status);
CREATE TABLE IF NOT EXISTS JobSource (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, providerType TEXT NOT NULL, baseUrl TEXT, isEnabled INTEGER NOT NULL DEFAULT 0, authorizationStatus TEXT NOT NULL DEFAULT 'PENDING', lastSyncAt DATETIME, lastErrorAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS ExternalJob (id INTEGER PRIMARY KEY AUTOINCREMENT, sourceId INTEGER NOT NULL, externalId TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL, location TEXT NOT NULL, state TEXT, country TEXT NOT NULL DEFAULT 'Malaysia', workArrangement TEXT, employmentType TEXT, industry TEXT, salaryMin INTEGER, salaryMax INTEGER, salaryCurrency TEXT, salaryText TEXT, descriptionSnippet TEXT NOT NULL, externalUrl TEXT NOT NULL, postedAt DATETIME, updatedAt DATETIME, lastCheckedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, expiresAt DATETIME, listingStatus TEXT NOT NULL DEFAULT 'ACTIVE', sourceStatus TEXT NOT NULL DEFAULT 'LIVE', isDemo INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(sourceId) REFERENCES JobSource(id) ON DELETE CASCADE, UNIQUE(sourceId, externalId));
CREATE INDEX IF NOT EXISTS ExternalJob_title_location_idx ON ExternalJob(title, location);
CREATE INDEX IF NOT EXISTS ExternalJob_lastCheckedAt_listingStatus_idx ON ExternalJob(lastCheckedAt, listingStatus);
CREATE TABLE IF NOT EXISTS ExternalJobSkill (id INTEGER PRIMARY KEY AUTOINCREMENT, externalJobId INTEGER NOT NULL, skillId INTEGER NOT NULL, requirementType TEXT NOT NULL DEFAULT 'UNVERIFIED', extractionConfidence REAL NOT NULL, extractionMethod TEXT NOT NULL, FOREIGN KEY(externalJobId) REFERENCES ExternalJob(id) ON DELETE CASCADE, FOREIGN KEY(skillId) REFERENCES Skill(id), UNIQUE(externalJobId, skillId));
CREATE TABLE IF NOT EXISTS ExternalJobMatch (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, externalJobId INTEGER NOT NULL, score INTEGER, scoreBreakdown TEXT NOT NULL, algorithmVersion TEXT NOT NULL, calculatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE, FOREIGN KEY(externalJobId) REFERENCES ExternalJob(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS ExternalJobMatch_candidateId_calculatedAt_idx ON ExternalJobMatch(candidateId, calculatedAt);
CREATE TABLE IF NOT EXISTS SavedExternalJob (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, externalJobId INTEGER NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE, FOREIGN KEY(externalJobId) REFERENCES ExternalJob(id) ON DELETE CASCADE, UNIQUE(candidateId, externalJobId));
CREATE TABLE IF NOT EXISTS ExternalApplicationTracker (id INTEGER PRIMARY KEY AUTOINCREMENT, candidateId INTEGER NOT NULL, externalJobId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'INTERESTED', notes TEXT, appliedAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(candidateId) REFERENCES Candidate(id) ON DELETE CASCADE, FOREIGN KEY(externalJobId) REFERENCES ExternalJob(id) ON DELETE CASCADE, UNIQUE(candidateId, externalJobId));
CREATE TABLE IF NOT EXISTS JobSyncLog (id INTEGER PRIMARY KEY AUTOINCREMENT, sourceId INTEGER NOT NULL, startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, finishedAt DATETIME, recordsReceived INTEGER NOT NULL DEFAULT 0, recordsAccepted INTEGER NOT NULL DEFAULT 0, recordsRejected INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, errorSummary TEXT, FOREIGN KEY(sourceId) REFERENCES JobSource(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS JobSyncLog_sourceId_startedAt_idx ON JobSyncLog(sourceId, startedAt);
`);
db.close();
console.log(`SQLite schema ready at ${dbPath}`);
