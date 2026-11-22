import React from "react";
import Link from "next/link";
import { JobOfferIntel } from "@/types/schemas";

interface JobCardProps {
  job: JobOfferIntel;
  showDiscountBadge?: boolean;
  onClickApply?: (job: JobOfferIntel) => void;
}

const DISCOUNT_PATTERNS = [
  /30\s*%?\s*(off|réduction|rabais|خصم)/i,
  /30\s*off/i,
  /خصم\s*30/i,
  /30%\s*sold/i
];

function hasDiscount30Off(text: string): boolean {
  return DISCOUNT_PATTERNS.some(pattern => pattern.test(text));
}

function getStatusColor(status: string): string {
  switch (status) {
    case "APPROVED": return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
    case "PENDING": return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    case "REJECTED": return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    default: return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
  }
}

function getMatchScoreColor(score: number): string {
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-400 dark:text-gray-500";
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  showDiscountBadge = true,
  onClickApply
}) => {
  const isDiscounted = hasDiscount30Off(job.job_title + job.company_name);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700">
      {/* Header row with status and discount badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
          {isDiscounted && showDiscountBadge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full animate-pulse">
              💰 30% OFF
            </span>
          )}
        </div>

        {onClickApply && (
          <button
            onClick={() => onClickApply(job)}
            className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
          >
            Candidater
          </button>
        )}
      </div>

      {/* Job title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {job.job_title}
      </h3>

      {/* Company name */}
      <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
        {job.company_name}
      </p>

      {/* Location */}
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
        📍 {job.location}
      </p>

      {/* Tech stack */}
      {job.tech_stack_required.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.tech_stack_required.slice(0, 5).map((tech, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Footer with score and actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className={`text-sm font-medium ${getMatchScoreColor(job.match_score)}`}>
          Score: {job.match_score}%
        </div>

        <div className="flex gap-2">
          {job.rh_contact.email && (
            <a
              href={`mailto:${job.rh_contact.email}?subject=${encodeURIComponent(`Candidature: ${job.job_title}`)}`}
              className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              ✉️ Email RH
            </a>
          )}
          <Link
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            🔍 Voir l'offre
          </Link>
        </div>
      </div>
    </div>
  );
};