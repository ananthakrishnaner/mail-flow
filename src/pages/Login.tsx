import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post("/token/", {
                username,
                password,
            });

            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);

            toast({
                title: "Login successful",
                description: "Welcome back!",
            });

            navigate("/");
        } catch (error) {
            console.error(error);
            toast({
                title: "Login failed",
                description: "Please check your credentials and try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Mail Muse</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground">
                    Protected by Django & React
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
