import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ReceiptHistoryScreen from "./screens/ReceiptHistoryScreen";
import KYCScreen from "./screens/KYCScreen";
import SettingsScreen from "./screens/SettingsScreen";

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Dashboard: undefined;
  ReceiptHistory: undefined;
  KYC: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerBackTitleVisible: false }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log In" }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up" }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Vault" }} />
          <Stack.Screen name="KYC" component={KYCScreen} options={{ title: "Verification" }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
          <Stack.Screen
            name="ReceiptHistory"
...
            options={{
              title: "Receipt History",
              headerStyle: { backgroundColor: "#0F172A" },
              headerTintColor: "#F8FAFC",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
