import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { organismDB } from "./db";
import type { Organism, OrganismStatus } from "./types";

interface ListOrganismsParams {
  status?: Query<OrganismStatus>;
  generation?: Query<number>;
  limit?: Query<number>;
}

interface ListOrganismsResponse {
  organisms: Organism[];
}

// Retrieves all organisms with optional filtering.
export const list = api<ListOrganismsParams, ListOrganismsResponse>(
  { expose: true, method: "GET", path: "/organisms" },
  async (params) => {
    let query = `SELECT * FROM organisms WHERE 1=1`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.status) {
      query += ` AND status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.generation) {
      query += ` AND generation = $${paramIndex}`;
      queryParams.push(params.generation);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(params.limit);
    }

    const organisms = await organismDB.rawQueryAll<Organism>(query, ...queryParams);
    return { organisms };
  }
);
