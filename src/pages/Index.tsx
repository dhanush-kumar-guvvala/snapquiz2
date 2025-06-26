
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Brain, Users, BarChart3, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-full">
              <GraduationCap className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Smart Quiz Maker
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create AI-powered quizzes instantly. Teachers can generate intelligent questions 
            from any topic, while students enjoy seamless quiz-taking experiences with 
            real-time analytics and results.
          </p>
          <div className="space-x-4">
            <Link to="/auth">
              <Button size="lg" className="px-8 py-3">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Brain className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>AI-Powered Generation</CardTitle>
              <CardDescription>
                Generate intelligent quizzes using Gemini AI. Simply provide a topic 
                or upload a PDF, and get professionally crafted questions instantly.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Users className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Multi-Role Support</CardTitle>
              <CardDescription>
                Separate dashboards for teachers and students. Teachers create and manage 
                quizzes, while students take them with simple quiz codes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>
                Track student performance with detailed analytics. View question-wise 
                statistics, score distributions, and participation metrics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Clock className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Timed Quizzes</CardTitle>
              <CardDescription>
                Set custom durations for quizzes with automatic submission. 
                Real-time countdown keeps students focused and engaged.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Shield className="h-10 w-10 text-red-600 mb-2" />
              <CardTitle>Secure & Fair</CardTitle>
              <CardDescription>
                One-time access per student ensures fairness. Results are delayed 
                by 1 hour to prevent answer sharing between students.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <GraduationCap className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>Multiple Question Types</CardTitle>
              <CardDescription>
                Support for multiple choice, true/false, fill-in-the-blank, 
                and theory questions with customizable difficulty levels.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Teacher Flow */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-blue-600">For Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-left space-y-3">
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                    <span>Enter a topic or upload a PDF document</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                    <span>Configure question types and difficulty levels</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                    <span>Let AI generate professional quiz questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                    <span>Review, edit, and activate your quiz</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">5</span>
                    <span>Share the quiz code with students</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Student Flow */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-green-600">For Students</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-left space-y-3">
                  <li className="flex items-start">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                    <span>Enter the quiz code provided by your teacher</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                    <span>Start the quiz and begin answering questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                    <span>Navigate through questions with the timer running</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                    <span>Submit your quiz before time runs out</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">5</span>
                    <span>View detailed results after 1 hour</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl shadow-lg p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of educators who are already using AI to create better 
            learning experiences. Start creating your first quiz today.
          </p>
          <Link to="/auth">
            <Button size="lg" className="px-8 py-3">
              Start Creating Quizzes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
