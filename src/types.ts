export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github?: string;
  twitter?: string;
  photoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  gradDate: string;
}

export interface Resume {
  id?: string;
  userId: string;
  title: string;
  originalFileName?: string;
  templateId: string;
  themeColor?: string;
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  projects: Project[];
  languages: string[];
  score: number;
  analysis?: {
    contentImpact: number;
    keywordMatching: number;
    suggestions: string[];
  };
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isPremium: boolean;
  resumeCount: number;
  createdAt: any;
  role?: string;
  lastResumeData?: Partial<Resume>;
}

export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  tags: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface PlanConfig {
  price: number;
  currency: string;
  billingCycle: string;
  features: string[];
}
