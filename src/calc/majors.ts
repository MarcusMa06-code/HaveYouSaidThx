/**
 * Major -> FeeCategory mapping for the "select your major" dropdown.
 * Source of truth: docs/tuition-fees-source.md ("Scope: which fee category
 * applies to which programme"). Do not add Built Environment, Architecture,
 * Landscape Architecture, Environmental Studies, or Pharmacy — they are not
 * S&T-eligible even though NUS may bill them under the same fee category.
 */
import type { FeeCategory } from "../../data/tuition-fees";

export interface MajorGroup {
  category: FeeCategory;
  label: string;
  majors: string[];
}

export const MAJOR_GROUPS: MajorGroup[] = [
  {
    category: "Computing",
    label: "Computing",
    majors: [
      "Artificial Intelligence",
      "Business Analytics",
      "Business Artificial Intelligence Systems",
      "Computer Science",
      "Information Security",
    ],
  },
  {
    category: "DesignAndEngineering",
    label: "Design and Engineering",
    majors: [
      "Biomedical Engineering",
      "Chemical Engineering",
      "Civil Engineering",
      "Computer Engineering",
      "Electrical Engineering",
      "Environmental & Sustainability Engineering",
      "Industrial & Systems Engineering",
      "Materials Science Engineering",
      "Mechanical Engineering",
      "Engineering Science",
      "Robotics & Machine Intelligence",
    ],
  },
  {
    category: "HumanitiesAndSciences",
    label: "Humanities and Sciences",
    majors: [
      "Chemistry",
      "Data Science and Analytics",
      "Data Science and Economics",
      "Food Science and Technology",
      "Life Sciences",
      "Mathematics",
      "Pharmaceutical Science",
      "Physics",
      "Quantitative Finance",
      "Statistics",
    ],
  },
];
