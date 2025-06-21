import React, { useState, useEffect } from 'react';
import VideoCall from './VideoCall';
import { apiRequest } from '../utils/api';

const TheoryLearning = ({ onClose, currentUser, theoryCourse }) => {
  const [sessions, setSessions] = useState([]);
  const [videoRooms, setVideoRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedRoomUrl, setSelectedRoomUrl] = useState('');
  const [activeTab, setActiveTab] = useState('schedule');

  // New session form state
  const [newSession, setNewSession] = useState({
    teacher_id: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: 'Online Theory Session'
  });

  const [availableTeachers, setAvailableTeachers] = useState([]);

  useEffect(() => {
    fetchSessions();
    fetchVideoRooms();
    fetchAvailableTeachers();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/sessions/my');
      
      // Filter for theory sessions only
      const theorySessions = response.filter(session => 
        session.session_type === 'theory'
      );
      setSessions(theorySessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoRooms = async () => {
    try {
      const response = await apiRequest('/api/video-rooms/my');
      
      // Filter for theory-related video rooms
      const theoryRooms = response.filter(room => 
        room.course_id === theoryCourse?.id
      );
      setVideoRooms(theoryRooms);
    } catch (error) {
      console.error('Error fetching video rooms:', error);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const response = await apiRequest('/api/teachers');
      setAvailableTeachers(response.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const sessionData = {
        ...newSession,
        course_id: theoryCourse?.id,
        session_type: 'theory'
      };

      await apiRequest('/api/sessions/schedule', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });

      setSuccess('Theory session scheduled successfully!');
      setNewSession({
        teacher_id: '',
        scheduled_at: '',
        duration_minutes: 60,
        location: 'Online Theory Session'
      });
      
      // Refresh sessions
      await fetchSessions();
    } catch (error) {
      setError('Failed to schedule session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinVideoRoom = (roomUrl) => {
    setSelectedRoomUrl(roomUrl);
    setShowVideoCall(true);
  };

  const formatDateTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatusBadge = (status) => {
    const statusClasses = {
      scheduled: 'bg-primary',
      in_progress: 'bg-warning',
      completed: 'bg-success',
      cancelled: 'bg-danger'
    };
    
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-6">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h3 mb-2">📚 Theory Learning Center</h2>
              <p className="mb-0 opacity-75">
                Join online theory sessions and track your progress
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-outline-light btn-sm"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="d-flex flex-column h-100" style={{height: 'calc(90vh - 120px)'}}>
          {/* Tabs */}
          <div className="border-bottom">
            <nav className="nav nav-pills p-3">
              <button
                className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                <i className="fas fa-calendar me-2"></i>
                My Schedule
              </button>
              <button
                className={`nav-link ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <i className="fas fa-video me-2"></i>
                Video Sessions
              </button>
              <button
                className={`nav-link ${activeTab === 'new' ? 'active' : ''}`}
                onClick={() => setActiveTab('new')}
              >
                <i className="fas fa-plus me-2"></i>
                Schedule New
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-grow-1 overflow-auto p-4">
            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-danger mb-4">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
            
            {success && (
              <div className="alert alert-success mb-4">
                <i className="fas fa-check-circle me-2"></i>
                {success}
              </div>
            )}

            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4>Your Theory Sessions</h4>
                  <span className="badge bg-info">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {sessions.length > 0 ? (
                  <div className="row g-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="col-md-6">
                        <div className="card border h-100">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <h6 className="card-title mb-1">
                                  <i className="fas fa-book me-2 text-primary"></i>
                                  Theory Session
                                </h6>
                                <p className="text-muted small mb-0">
                                  {session.teacher_name || 'Teacher TBD'}
                                </p>
                              </div>
                              <span className={getSessionStatusBadge(session.status)}>
                                {session.status}
                              </span>
                            </div>

                            <div className="session-details">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-calendar-alt me-2 text-muted"></i>
                                <span className="small">
                                  {formatDateTime(session.scheduled_at)}
                                </span>
                              </div>
                              
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-clock me-2 text-muted"></i>
                                <span className="small">
                                  {session.duration_minutes} minutes
                                </span>
                              </div>
                              
                              <div className="d-flex align-items-center mb-3">
                                <i className="fas fa-map-marker-alt me-2 text-muted"></i>
                                <span className="small">
                                  {session.location}
                                </span>
                              </div>
                            </div>

                            {session.status === 'scheduled' && (
                              <div className="d-grid">
                                <button className="btn btn-primary btn-sm">
                                  <i className="fas fa-video me-1"></i>
                                  Ready to Join
                                </button>
                              </div>
                            )}

                            {session.status === 'completed' && (
                              <div className="alert alert-success p-2 mb-0">
                                <i className="fas fa-check me-1"></i>
                                Session completed successfully
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-calendar-times fa-4x text-muted mb-4"></i>
                    <h5 className="text-muted mb-3">No theory sessions scheduled</h5>
                    <p className="text-muted mb-4">
                      Schedule your first theory session to get started
                    </p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="btn btn-primary"
                    >
                      <i className="fas fa-plus me-2"></i>
                      Schedule Session
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video Sessions Tab */}
            {activeTab === 'video' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4>Available Video Sessions</h4>
                  <span className="badge bg-success">
                    {videoRooms.length} room{videoRooms.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {videoRooms.length > 0 ? (
                  <div className="row g-3">
                    {videoRooms.map((room) => (
                      <div key={room.id} className="col-md-6">
                        <div className="card border h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                              <div className="icon-circle bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                                <i className="fas fa-video fa-lg"></i>
                              </div>
                              <div>
                                <h6 className="mb-1">{room.room_name}</h6>
                                <p className="text-muted small mb-0">
                                  Theory Video Session
                                </p>
                              </div>
                            </div>

                            <div className="room-details mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-calendar me-2 text-muted"></i>
                                <span className="small">
                                  {formatDateTime(room.scheduled_at)}
                                </span>
                              </div>
                              
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-clock me-2 text-muted"></i>
                                <span className="small">
                                  {room.duration_minutes} minutes
                                </span>
                              </div>
                            </div>

                            <div className="d-grid">
                              <button
                                onClick={() => handleJoinVideoRoom(room.room_url)}
                                className="btn btn-success"
                                disabled={!room.is_active}
                              >
                                <i className="fas fa-video me-1"></i>
                                {room.is_active ? 'Join Session' : 'Session Ended'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-video-slash fa-4x text-muted mb-4"></i>
                    <h5 className="text-muted mb-3">No video sessions available</h5>
                    <p className="text-muted">
                      Video sessions will appear here when teachers create them
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Schedule New Tab */}
            {activeTab === 'new' && (
              <div>
                <h4 className="mb-4">Schedule New Theory Session</h4>
                
                <form onSubmit={handleScheduleSession}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Select Teacher</label>
                      <select
                        className="form-select"
                        value={newSession.teacher_id}
                        onChange={(e) => setNewSession({...newSession, teacher_id: e.target.value})}
                        required
                      >
                        <option value="">Choose a teacher...</option>
                        {availableTeachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.user_name} - Rating: {teacher.rating}/5
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Session Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={newSession.scheduled_at}
                        onChange={(e) => setNewSession({...newSession, scheduled_at: e.target.value})}
                        min={new Date().toISOString().slice(0, 16)}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes)</label>
                      <select
                        className="form-select"
                        value={newSession.duration_minutes}
                        onChange={(e) => setNewSession({...newSession, duration_minutes: parseInt(e.target.value)})}
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Location/Type</label>
                      <select
                        className="form-select"
                        value={newSession.location}
                        onChange={(e) => setNewSession({...newSession, location: e.target.value})}
                      >
                        <option value="Online Theory Session">Online Theory Session</option>
                        <option value="Classroom Theory">Classroom Theory</option>
                        <option value="Mixed Theory Session">Mixed Theory Session</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        Your session request will be sent to the selected teacher for confirmation.
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="d-flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                              Scheduling...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-calendar-plus me-2"></i>
                              Schedule Session
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('schedule')}
                          className="btn btn-outline-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Course Progress Footer */}
          {theoryCourse && (
            <div className="border-top p-3 bg-light">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted">Theory Course Progress:</small>
                  <div className="fw-bold">
                    {theoryCourse.completed_sessions}/{theoryCourse.total_sessions} sessions completed
                  </div>
                </div>
                <div>
                  <div className="progress" style={{width: '150px', height: '20px'}}>
                    <div 
                      className="progress-bar bg-primary" 
                      role="progressbar" 
                      style={{width: `${(theoryCourse.completed_sessions / theoryCourse.total_sessions) * 100}%`}}
                    >
                      {Math.round((theoryCourse.completed_sessions / theoryCourse.total_sessions) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCall
          roomUrl={selectedRoomUrl}
          onLeave={() => {
            setShowVideoCall(false);
            setSelectedRoomUrl('');
          }}
        />
      )}
    </div>
  );
};

export default TheoryLearning;