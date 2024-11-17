import { ICreatePalletDto } from "./pallet.dto";

export const PalletGroupDto = {
  type: "object",
  required: ["id", "name", "pallets", "createdAt", "updatedAt"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    location: { type: "string" },
    pallets: {
      type: "array",
      items: { $ref: "#/components/schemas/PalletDto" },
    },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const CreatePalletGroupDto = {
  type: "object",
  required: ["name", "pallets"],
  properties: {
    name: { type: "string" },
    location: { type: "string" },
    pallets: {
      type: "array",
      items: { $ref: "#/components/schemas/CreatePalletDto" },
    },
  },
};

export type ICreatePalletGroupDto = {
  name: string;
  location: string;
  pallets: ICreatePalletDto[];
};
