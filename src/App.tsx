import { AuthProvider } from "./utils/AuthContext";
import Index from "./pages/Index";

const App = () => (
  <AuthProvider>
    <Index />
  </AuthProvider>
);

export default App;
