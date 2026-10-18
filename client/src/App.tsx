import { createBrowserRouter } from "react-router";
import { AppShell, RouteError } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import TopicPage from "./pages/Topic";
import LessonPage from "./pages/Lesson";
import PracticeSetup from "./pages/PracticeSetup";
import PracticeSessionPage from "./pages/PracticeSession";
import Mistakes from "./pages/Mistakes";
import MockTests from "./pages/MockTests";
import MockExam from "./pages/MockExam";
import MockResultsPage from "./pages/MockResults";
import HazardHome from "./pages/HazardHome";
import HazardClipPage from "./pages/HazardClip";
import HazardRun from "./pages/HazardRun";
import RoadSigns from "./pages/RoadSigns";
import Flashcards from "./pages/Flashcards";
import Progress from "./pages/Progress";
import Bookmarks from "./pages/Bookmarks";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "learn", element: <Learn /> },
      { path: "learn/:topicId", element: <TopicPage /> },
      { path: "learn/:topicId/:lessonId", element: <LessonPage /> },
      { path: "practice", element: <PracticeSetup /> },
      { path: "practice/s/:id", element: <PracticeSessionPage /> },
      { path: "mistakes", element: <Mistakes /> },
      { path: "mock-tests", element: <MockTests /> },
      { path: "mock-tests/:id/results", element: <MockResultsPage /> },
      { path: "hazard-perception", element: <HazardHome /> },
      { path: "hazard-perception/run", element: <HazardRun /> },
      { path: "hazard-perception/:clipId", element: <HazardClipPage /> },
      { path: "road-signs", element: <RoadSigns /> },
      { path: "road-signs/flashcards", element: <Flashcards /> },
      { path: "progress", element: <Progress /> },
      { path: "bookmarks", element: <Bookmarks /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // The exam runs full screen without the app navigation, like the real test.
  { path: "mock-tests/:id", element: <MockExam />, errorElement: <RouteError /> },
]);
