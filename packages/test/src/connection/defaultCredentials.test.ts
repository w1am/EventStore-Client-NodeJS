import { collect, createTestNode } from "@test-utils";
import { EventStoreDBClient, AccessDeniedError } from "@eventstore/db-client";

describe("defaultCredentials", () => {
  const node = createTestNode();

  beforeAll(async () => {
    await node.up();
  });

  afterAll(async () => {
    await node.down();
  });

  describe("should set default credentials to be used by commands", () => {
    test("bad override", async () => {
      const client = new EventStoreDBClient(
        { endpoint: node.uri },
        { rootCertificate: node.certs.root },
        { username: "admin", password: "changeit" }
      );
      await expect(
        collect(client.readAll({ maxCount: 10 }))
      ).resolves.toBeDefined();
      await expect(
        collect(
          client.readAll({
            maxCount: 10,
            credentials: { username: "AzureDiamond", password: "hunter2" },
          })
        )
      ).rejects.toThrowError(AccessDeniedError);
    });

    test("good override", async () => {
      const client = new EventStoreDBClient(
        { endpoint: node.uri },
        { rootCertificate: node.certs.root },
        { username: "AzureDiamond", password: "hunter2" }
      );
      await expect(
        collect(client.readAll({ maxCount: 10 }))
      ).rejects.toThrowError(AccessDeniedError);
      await expect(
        collect(
          client.readAll({
            maxCount: 10,
            credentials: { username: "admin", password: "changeit" },
          })
        )
      ).resolves.toBeDefined();
    });
  });
});
