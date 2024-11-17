export const JobGroupDto = {
  type: "object",
  required: ["id", "name", "jobs"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    location: { type: "string" },
    enableConcurrent: { type: "boolean" },
    jobs: {
      type: "array",
      items: { $ref: "#/components/schemas/JobDto" },
    },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};
