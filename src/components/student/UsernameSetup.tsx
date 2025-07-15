import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UsernameSetupProps {
  onComplete: () => void;
}

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ onComplete }) => {
  const { profile, fetchProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid username",
        variant: "destructive",
      });
      return;
    }

    if (username.length < 3) {
      toast({
        title: "Username Too Short",
        description: "Username must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (username.length > 20) {
      toast({
        title: "Username Too Long",
        description: "Username must be 20 characters or less",
        variant: "destructive",
      });
      return;
    }

    // Check for valid characters (alphanumeric, underscore, dash)
    const validUsername = /^[a-zA-Z0-9_-]+$/.test(username);
    if (!validUsername) {
      toast({
        title: "Invalid Characters",
        description: "Username can only contain letters, numbers, underscores, and dashes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', profile?.id);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Username Taken",
            description: "This username is already taken. Please choose another one.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      await fetchProfile(); // Refresh profile data
      
      toast({
        title: "Username Set!",
        description: `Your username "${username}" has been set successfully`,
      });

      onComplete();
    } catch (error) {
      console.error('Error setting username:', error);
      toast({
        title: "Error",
        description: "Failed to set username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            Create a unique username that will be displayed to your teachers and in quiz results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                minLength={3}
                maxLength={20}
              />
              <p className="text-sm text-gray-500">
                3-20 characters, letters, numbers, underscores, and dashes only
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !username.trim()}
            >
              {loading ? "Setting Username..." : "Set Username"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};