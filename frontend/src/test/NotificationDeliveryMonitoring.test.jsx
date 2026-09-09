import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import NotificationDeliveryMonitoring from "../pages/NotificationDeliveryMonitoring";


function responseWith(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
  });
}


function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/notification-delivery-monitoring",
      ]}
    >
      <Routes>
        <Route
          path="/notification-delivery-monitoring"
          element={
            <NotificationDeliveryMonitoring />
          }
        />

        <Route
          path="/"
          element={<div>Login Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}


describe("Notification Delivery Monitoring", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "test-admin-token");

    vi.restoreAllMocks();

    global.fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        responseWith({
          total: 1,
          skip: 0,
          limit: 20,
          items: [
            {
              id: 1,
              user_id: 4,
              channel: "EMAIL",
              recipient: "member@example.com",
              subject: "Library Book Due Reminder",
              reference_type: "ISSUE_DUE",
              reference_id: 10,
              delivery_status: "SENT",
              error_message: null,
              attempted_at:
                "2026-09-09T08:30:00",
            },
          ],
        })
      )
      .mockImplementationOnce(() =>
        responseWith({
          total: 1,
          skip: 0,
          limit: 1,
          items: [],
        })
      )
      .mockImplementationOnce(() =>
        responseWith({
          total: 0,
          skip: 0,
          limit: 1,
          items: [],
        })
      );
  });

  test(
    "loads and displays notification delivery history",
    async () => {
      renderPage();

      expect(
        screen.getByRole("heading", {
          name: "Notification Delivery Monitoring",
        })
      ).toBeInTheDocument();

      expect(
        await screen.findByText(
          "member@example.com"
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Library Book Due Reminder"
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole("cell", {
        name: "Due Reminder",
        })
        ).toBeInTheDocument();

      expect(
        screen.getByText("SENT")
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    }
  );
});