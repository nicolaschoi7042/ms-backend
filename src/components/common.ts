export const PaginationDto = {
  type: "object",
  required: [
    "totalItemCount",
    "currentItemCount",
    "totalPage",
    "currentPage",
    "itemsPerPage",
  ],
  properties: {
    totalItemCount: { type: "integer" },
    currentItemCount: { type: "integer" },
    totalPage: { type: "integer" },
    currentPage: { type: "integer" },
    itemsPerPage: { type: "integer" },
  },
};

export const securitySchemes = {
  Authorization: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    value: "Bearer <JWT token here>",
  },
};
