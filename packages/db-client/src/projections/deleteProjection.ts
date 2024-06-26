import { ProjectionsClient } from "../../generated/projections_grpc_pb";
import { DeleteReq } from "../../generated/projections_pb";

import { Client } from "../Client";
import type { BaseOptions } from "../types";
import { debug, convertToCommandError } from "../utils";

export interface DeleteProjectionOptions extends BaseOptions {
  /**
   * Deletes emitted streams.
   * @defaultValue false
   */
  deleteEmittedStreams?: boolean;

  /**
   * Deletes state stream.
   * @defaultValue false
   */
  deleteStateStream?: boolean;

  /**
   * Deletes checkpoint stream.
   * @defaultValue false
   */
  deleteCheckpointStream?: boolean;
}

declare module "../Client" {
  interface Client {
    /**
     * Deletes a projection.
     * @param projectionName - The name of the projection to delete.
     * @param options - Delete projection options.
     */
    deleteProjection(
      projectionName: string,
      options?: DeleteProjectionOptions
    ): Promise<void>;
  }
}

Client.prototype.deleteProjection = async function (
  this: Client,
  projectionName: string,
  {
    deleteEmittedStreams = false,
    deleteStateStream = false,
    deleteCheckpointStream = false,
    ...baseOptions
  }: DeleteProjectionOptions = {}
): Promise<void> {
  const req = new DeleteReq();
  const options = new DeleteReq.Options();

  options.setName(projectionName);
  options.setDeleteEmittedStreams(deleteEmittedStreams);
  options.setDeleteStateStream(deleteStateStream);
  options.setDeleteCheckpointStream(deleteCheckpointStream);

  req.setOptions(options);

  debug.command("deleteProjection: %O", {
    projectionName,
    options: {
      deleteEmittedStreams,
      deleteStateStream,
      deleteCheckpointStream,
      ...baseOptions,
    },
  });
  debug.command_grpc("deleteProjection: %g", req);

  return this.execute(
    ProjectionsClient,
    "deleteProjection",
    (client) =>
      new Promise<void>((resolve, reject) => {
        client.delete(req, ...this.callArguments(baseOptions), (error) => {
          if (error) return reject(convertToCommandError(error));
          return resolve();
        });
      })
  );
};
