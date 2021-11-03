import { StreamIdentifier } from "../../generated/shared_pb";
import { UpdateReq } from "../../generated/persistent_pb";
import { PersistentSubscriptionsClient } from "../../generated/persistent_grpc_pb";

import { debug, convertToCommandError } from "../utils";
import { END, START } from "../constants";
import { Client } from "../Client";
import { BaseOptions } from "../types";
import { PersistentSubscriptionSettings } from "./utils/persistentSubscriptionSettings";
import { settingsToGRPC } from "./utils/settingsToGRPC";

declare module "../Client" {
  interface Client {
    /**
     * Updates a persistent subscription configuration.
     * @param streamName A stream name.
     * @param groupName A group name.
     * @param settings PersistentSubscription settings.
     * @see {@link persistentSubscriptionSettingsFromDefaults}
     * @param options Command options.
     */
    updatePersistentSubscription(
      streamName: string,
      groupName: string,
      settings: PersistentSubscriptionSettings,
      options?: BaseOptions
    ): Promise<void>;
  }
}

Client.prototype.updatePersistentSubscription = async function (
  this: Client,
  streamName: string,
  groupName: string,
  settings: PersistentSubscriptionSettings,
  baseOptions: BaseOptions = {}
): Promise<void> {
  const req = new UpdateReq();
  const options = new UpdateReq.Options();
  const identifier = new StreamIdentifier();

  const reqSettings = settingsToGRPC(settings, UpdateReq.Settings);

  // Add deprecated revision option for pre-21.10 support
  switch (settings.startFrom) {
    case START: {
      reqSettings.setRevision(BigInt(0).toString(10));
      break;
    }
    case END: {
      // This is the largest possible value of UInt64
      reqSettings.setRevision("18446744073709551615");
      break;
    }
    default: {
      reqSettings.setRevision(settings.startFrom.toString(10));
      break;
    }
  }

  identifier.setStreamName(Uint8Array.from(Buffer.from(streamName, "utf8")));

  options.setGroupName(groupName);
  options.setStreamIdentifier(identifier);
  options.setSettings(reqSettings);

  req.setOptions(options);

  debug.command("updatePersistentSubscription: %O", {
    streamName,
    groupName,
    settings,
    options: baseOptions,
  });
  debug.command_grpc("updatePersistentSubscription: %g", req);

  return this.execute(
    PersistentSubscriptionsClient,
    "updatePersistentSubscription",
    (client) =>
      new Promise<void>((resolve, reject) => {
        client.update(req, ...this.callArguments(baseOptions), (error) => {
          if (error) return reject(convertToCommandError(error));
          return resolve();
        });
      })
  );
};
