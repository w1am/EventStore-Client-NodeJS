import {
  ProjectionsClient,
  ProjectionsService,
} from "../../generated/projections_grpc_pb";
import { CreateReq } from "../../generated/projections_pb";

import { Client } from "../Client";
import type { BaseOptions } from "../types";
import { debug, convertToCommandError } from "../utils";

export interface CreateProjectionOptions extends BaseOptions {
  /**
   * Enables emitting from the projection.
   * @defaultValue false
   */
  emitEnabled?: boolean;
  /**
   * Enables tracking emitted streams.
   * @defaultValue false
   */
  trackEmittedStreams?: boolean;
}

declare module "../Client" {
  interface Client {
    /**
     * Creates a continuous projection.
     * @param projectionName - The name of the projection.
     * @param query - The query to run.
     * @param options - Projection options.
     */
    createProjection(
      projectionName: string,
      query: string,
      options?: CreateProjectionOptions
    ): Promise<void>;
  }
}

Client.prototype.createProjection = async function (
  this: Client,
  projectionName: string,
  query: string,
  options: CreateProjectionOptions = {}
): Promise<void> {
  debug.command("createProjection: %O", {
    projectionName,
    query,
    options,
  });

  if (
    options.trackEmittedStreams &&
    !(await this.supports(ProjectionsService.create, "track_emitted_streams"))
  ) {
    return createProjectionHTTP.call(this, projectionName, query, options);
  }

  return createProjectionGRPC.call(this, projectionName, query, options);
};

const createProjectionGRPC = async function (
  this: Client,
  projectionName: string,
  query: string,
  {
    emitEnabled = false,
    trackEmittedStreams = false,
    ...baseOptions
  }: CreateProjectionOptions = {}
): Promise<void> {
  const req = new CreateReq();
  const options = new CreateReq.Options();
  const continuous = new CreateReq.Options.Continuous();

  continuous.setName(projectionName);
  continuous.setEmitEnabled(emitEnabled);
  continuous.setTrackEmittedStreams(trackEmittedStreams);

  options.setContinuous(continuous);
  options.setQuery(query);

  req.setOptions(options);

  debug.command_grpc("createProjection: %g", req);

  return this.execute(
    ProjectionsClient,
    "createProjection",
    (client) =>
      new Promise<void>((resolve, reject) => {
        client.create(req, ...this.callArguments(baseOptions), (error) => {
          if (error) return reject(convertToCommandError(error));
          return resolve();
        });
      })
  );
};

const createProjectionHTTP = async function (
  this: Client,
  projectionName: string,
  query: string,
  {
    emitEnabled = false,
    trackEmittedStreams = false,
    ...baseOptions
  }: CreateProjectionOptions = {}
) {
  await this.HTTPRequest(
    "POST",
    `/projections/continuous`,
    {
      ...baseOptions,
      searchParams: {
        name: projectionName,
        emit: emitEnabled.toString(),
        trackemittedstreams: trackEmittedStreams.toString(),
      },
    },
    query
  );
};
