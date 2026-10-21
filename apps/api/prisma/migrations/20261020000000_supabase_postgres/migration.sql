-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "preferredRoles" TEXT NOT NULL DEFAULT '',
    "preferredLocations" TEXT NOT NULL DEFAULT '',
    "arrangements" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companySize" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "evidenceType" TEXT,
    "evidenceUrl" TEXT,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "employerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "arrangement" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "salary" TEXT,
    "deadline" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "screeningCriteria" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningCandidate" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "override" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'REVIEW',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "required" BOOLEAN NOT NULL,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "coverNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "parsingStatus" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" SERIAL NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "readinessBreakdown" TEXT NOT NULL,
    "extractedSections" TEXT NOT NULL,
    "detectedSkills" TEXT NOT NULL,
    "parsingIssues" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeJobMatch" (
    "id" SERIAL NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "jobId" INTEGER,
    "manualJobDescription" TEXT,
    "jobTitle" TEXT,
    "jobAlignmentScore" INTEGER NOT NULL,
    "scoreBreakdown" TEXT NOT NULL,
    "matchedSkills" TEXT NOT NULL,
    "missingSkills" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeJobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeSuggestion" (
    "id" SERIAL NOT NULL,
    "analysisId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "originalText" TEXT,
    "suggestedText" TEXT,
    "explanation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ResumeSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authorizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJob" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Malaysia',
    "workArrangement" TEXT,
    "employmentType" TEXT,
    "industry" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryText" TEXT,
    "descriptionSnippet" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "listingStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceStatus" TEXT NOT NULL DEFAULT 'LIVE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJobSkill" (
    "id" SERIAL NOT NULL,
    "externalJobId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "requirementType" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "extractionConfidence" DOUBLE PRECISION NOT NULL,
    "extractionMethod" TEXT NOT NULL,

    CONSTRAINT "ExternalJobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJobMatch" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "externalJobId" INTEGER NOT NULL,
    "score" INTEGER,
    "scoreBreakdown" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalJobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedExternalJob" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "externalJobId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExternalJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApplicationTracker" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "externalJobId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INTERESTED',
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalApplicationTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSyncLog" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsReceived" INTEGER NOT NULL DEFAULT 0,
    "recordsAccepted" INTEGER NOT NULL DEFAULT 0,
    "recordsRejected" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorSummary" TEXT,

    CONSTRAINT "JobSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_userId_key" ON "Employer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_normalized_key" ON "Skill"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSkill_candidateId_skillId_key" ON "CandidateSkill"("candidateId", "skillId");

-- CreateIndex
CREATE INDEX "ScreeningCandidate_jobId_idx" ON "ScreeningCandidate"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSkill_jobId_skillId_key" ON "JobSkill"("jobId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateId_jobId_key" ON "Application"("candidateId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_candidateId_jobId_key" ON "SavedJob"("candidateId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_candidateId_resourceId_key" ON "LearningProgress"("candidateId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_storageKey_key" ON "Resume"("storageKey");

-- CreateIndex
CREATE INDEX "Resume_candidateId_uploadedAt_idx" ON "Resume"("candidateId", "uploadedAt");

-- CreateIndex
CREATE INDEX "ResumeAnalysis_candidateId_analyzedAt_idx" ON "ResumeAnalysis"("candidateId", "analyzedAt");

-- CreateIndex
CREATE INDEX "ResumeAnalysis_resumeId_analyzedAt_idx" ON "ResumeAnalysis"("resumeId", "analyzedAt");

-- CreateIndex
CREATE INDEX "ResumeJobMatch_candidateId_analyzedAt_idx" ON "ResumeJobMatch"("candidateId", "analyzedAt");

-- CreateIndex
CREATE INDEX "ResumeJobMatch_resumeId_analyzedAt_idx" ON "ResumeJobMatch"("resumeId", "analyzedAt");

-- CreateIndex
CREATE INDEX "ResumeSuggestion_analysisId_status_idx" ON "ResumeSuggestion"("analysisId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_name_key" ON "JobSource"("name");

-- CreateIndex
CREATE INDEX "ExternalJob_title_location_idx" ON "ExternalJob"("title", "location");

-- CreateIndex
CREATE INDEX "ExternalJob_lastCheckedAt_listingStatus_idx" ON "ExternalJob"("lastCheckedAt", "listingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJob_sourceId_externalId_key" ON "ExternalJob"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJobSkill_externalJobId_skillId_key" ON "ExternalJobSkill"("externalJobId", "skillId");

-- CreateIndex
CREATE INDEX "ExternalJobMatch_candidateId_calculatedAt_idx" ON "ExternalJobMatch"("candidateId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedExternalJob_candidateId_externalJobId_key" ON "SavedExternalJob"("candidateId", "externalJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApplicationTracker_candidateId_externalJobId_key" ON "ExternalApplicationTracker"("candidateId", "externalJobId");

-- CreateIndex
CREATE INDEX "JobSyncLog_sourceId_startedAt_idx" ON "JobSyncLog"("sourceId", "startedAt");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCandidate" ADD CONSTRAINT "ScreeningCandidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeJobMatch" ADD CONSTRAINT "ResumeJobMatch_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeJobMatch" ADD CONSTRAINT "ResumeJobMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeJobMatch" ADD CONSTRAINT "ResumeJobMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeSuggestion" ADD CONSTRAINT "ResumeSuggestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJob" ADD CONSTRAINT "ExternalJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobSkill" ADD CONSTRAINT "ExternalJobSkill_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobSkill" ADD CONSTRAINT "ExternalJobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobMatch" ADD CONSTRAINT "ExternalJobMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobMatch" ADD CONSTRAINT "ExternalJobMatch_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExternalJob" ADD CONSTRAINT "SavedExternalJob_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExternalJob" ADD CONSTRAINT "SavedExternalJob_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalApplicationTracker" ADD CONSTRAINT "ExternalApplicationTracker_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalApplicationTracker" ADD CONSTRAINT "ExternalApplicationTracker_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSyncLog" ADD CONSTRAINT "JobSyncLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
