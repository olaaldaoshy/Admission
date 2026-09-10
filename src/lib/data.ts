
// This file is now empty as all data is served from Firestore real-time.
export type Application = {
  id: string;
  studentName: string;
  school: string;
  grade: string;
  status: string;
  applicationDate: string;
  phones?: string;
  parentName?: string;
  assignedEmployee?: string;
};

export const applications: Application[] = [];
