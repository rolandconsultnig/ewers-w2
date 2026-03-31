import { ResponseActivity } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResponseActivities() {
  const { data: activities, isLoading, error } = useQuery<ResponseActivity[]>({
    queryKey: ["/api/response-activities"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="rounded-full bg-success/10 p-2 mr-3">
            <CheckCircle className="text-success h-5 w-5" />
          </div>
        );
      case 'in_progress':
        return (
          <div className="rounded-full bg-primary/10 p-2 mr-3">
            <Clock className="text-primary h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-neutral-200 p-2 mr-3">
            <Calendar className="text-neutral-500 h-5 w-5" />
          </div>
        );
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const activityDate = new Date(date);
    
    // Same day
    if (activityDate.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (activityDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (activityDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Format as "X days ago" or with date
    const diffTime = Math.abs(now.getTime() - activityDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7 && activityDate < now) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffDays <= 7 && activityDate > now) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else {
      return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }).format(activityDate);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow border border-neutral-200">
      <CardHeader className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <CardTitle className="font-medium text-lg">Recent Response Activities</CardTitle>
        <Button variant="link" className="text-primary text-sm font-medium hover:text-primary-dark p-0">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-neutral-200">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="w-full">
                  <Skeleton className="h-5 w-2/3 mb-1" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="p-4 text-center text-error">
            Failed to load activities. Please try again.
          </div>
        ) : activities?.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No recent response activities.
          </div>
        ) : (
          activities?.slice(0, 3).map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-neutral-50">
              <div className="flex items-start">
                {getStatusIcon(activity.status)}
                <div>
                  <h3 className="font-medium text-neutral-900">{activity.title}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{activity.description}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-neutral-500">
                      {activity.status === 'completed' ? 'Completed by' : 
                       activity.status === 'in_progress' ? 'In progress by' : 'Scheduled for'}
                    </span>
                    <span className="text-xs font-medium text-neutral-800 ml-1">
                      {activity.assignedTeamId != null ? `Team #${activity.assignedTeamId}` : "Unassigned"}
                    </span>
                    <span className="text-xs text-neutral-500 ml-3">
                      {formatDate(activity.status === 'completed' ? activity.completedAt! : activity.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
