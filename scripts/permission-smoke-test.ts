import { assertCanAdminWorkspace, assertCanEditWorkspace, assertNotDemoUser } from "../packages/tenancy/src/permissions";

function expectAllowed(name: string, action: () => void) {
  try {
    action();
  } catch (error) {
    throw new Error(`${name} should be allowed, got: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectDenied(name: string, action: () => void) {
  let denied = false;
  try {
    action();
  } catch {
    denied = true;
  }

  if (!denied) {
    throw new Error(`${name} should be denied`);
  }
}

for (const role of ["owner", "admin", "manager", "member"]) {
  expectAllowed(`${role} can edit work records`, () => assertCanEditWorkspace({ role }));
}

expectDenied("guest cannot edit work records", () => assertCanEditWorkspace({ role: "guest" }));

for (const role of ["owner", "admin"]) {
  expectAllowed(`${role} can administer workspace`, () => assertCanAdminWorkspace({ role }));
}

for (const role of ["manager", "member", "guest"]) {
  expectDenied(`${role} cannot administer workspace`, () => assertCanAdminWorkspace({ role }));
}

expectDenied("demo user cannot manage protected settings", () => assertNotDemoUser({ role: "owner", isDemoUser: true }));
expectAllowed("non-demo owner can manage protected settings", () => assertNotDemoUser({ role: "owner", isDemoUser: false }));

console.log("permission smoke test passed");
