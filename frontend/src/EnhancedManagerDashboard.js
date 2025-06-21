import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedManagerDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolData, setSchoolData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student Management States
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState({
    search: '',
    status: 'all',
    course_progress: 'all',
    gender: 'all'
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState({});
  const [studentNotes, setStudentNotes] = useState({});
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // Modal states
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSchoolEditModal, setShowSchoolEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    password: '',
    can_teach_male: true,
    can_teach_female: true
  });

  const [schoolEditForm, setSchoolEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    price: 0
  });

  const [scheduleForm, setScheduleForm] = useState({
    teacher_id: '',
    student_id: '',
    course_id: '',
    session_type: 'theory',
    scheduled_at: '',
    duration_minutes: 60,
    location: ''
  });

  // Add state for teacher-student pairs
  const [teacherStudentPairs, setTeacherStudentPairs] = useState([]);
  const [filteredPairs, setFilteredPairs] = useState([]);

  useEffect(() => {
    fetchManagerData();
  }, [user]);

  // Filter students when filters change
  useEffect(() => {
    filterStudents();
  }, [students, studentFilters]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch school data
      const schoolResponse = await axios.get(`${API}/schools/my`, { headers });
      setSchoolData(schoolResponse.data);
      setSchoolEditForm({
        name: schoolResponse.data.name || '',
        address: schoolResponse.data.address || '',
        phone: schoolResponse.data.phone || '',
        email: schoolResponse.data.email || '',
        description: schoolResponse.data.description || '',
        price: schoolResponse.data.price || 0
      });

      // Fetch enrollments
      const enrollmentsResponse = await axios.get(`${API}/manager/enrollments`, { headers });
      setEnrollments(enrollmentsResponse.data.enrollments || []);
      setStudents(enrollmentsResponse.data.enrollments || []);

      // Fetch teachers
      const teachersResponse = await axios.get(`${API}/teachers/my`, { headers });
      setTeachers(teachersResponse.data.teachers || []);

      // Fetch teacher-student pairs for scheduling
      try {
        const pairsResponse = await axios.get(`${API}/manager/assigned-teacher-student-pairs/${schoolResponse.data.id}`, { headers });
        setTeacherStudentPairs(pairsResponse.data.pairs || []);
        setFilteredPairs(pairsResponse.data.pairs || []);
      } catch (pairsError) {
        console.warn('Teacher-student pairs not available:', pairsError);
        setTeacherStudentPairs([]);
        setFilteredPairs([]);
      }

      // Fetch analytics
      try {
        const analyticsResponse = await axios.get(`${API}/analytics/school-overview`, { headers });
        setAnalytics(analyticsResponse.data);
      } catch (analyticsError) {
        console.warn('Analytics not available:', analyticsError);
        setAnalytics({
          total_students: enrollmentsResponse.data.enrollments?.length || 0,
          completion_rate: 0,
          average_rating: schoolResponse.data.rating || 0,
          total_revenue: 0
        });
      }

      // Fetch student progress for each student
      await fetchStudentProgress(enrollmentsResponse.data.enrollments || []);

    } catch (error) {
      console.error('Error fetching manager data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Student Management Functions
  const fetchStudentProgress = async (studentsList) => {
    const headers = { Authorization: `Bearer ${token}` };
    const progressData = {};
    
    for (const student of studentsList) {
      try {
        const response = await axios.get(`${API}/analytics/student-progress/${student.student_id}`, { headers });
        progressData[student.student_id] = response.data;
      } catch (error) {
        console.warn(`Failed to fetch progress for student ${student.student_id}`);
        progressData[student.student_id] = {
          course_progress: { theory: 0, park: 0, road: 0 },
          total_sessions_attended: 0,
          certificates_earned: 0,
          average_quiz_score: 0
        };
      }
    }
    setStudentProgress(progressData);
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Search filter
    if (studentFilters.search) {
      filtered = filtered.filter(student => 
        student.student_name?.toLowerCase().includes(studentFilters.search.toLowerCase()) ||
        student.student_email?.toLowerCase().includes(studentFilters.search.toLowerCase())
      );
    }

    // Status filter
    if (studentFilters.status !== 'all') {
      filtered = filtered.filter(student => student.enrollment_status === studentFilters.status);
    }

    // Course progress filter
    if (studentFilters.course_progress !== 'all') {
      filtered = filtered.filter(student => {
        const progress = studentProgress[student.student_id];
        if (!progress) return false;
        
        switch (studentFilters.course_progress) {
          case 'theory':
            return progress.course_progress?.theory > 0;
          case 'park':
            return progress.course_progress?.park > 0;
          case 'road':
            return progress.course_progress?.road > 0;
          case 'completed':
            return progress.certificates_earned > 0;
          default:
            return true;
        }
      });
    }

    // Gender filter (based on student info if available)
    if (studentFilters.gender !== 'all') {
      filtered = filtered.filter(student => student.student_gender === studentFilters.gender);
    }

    setFilteredStudents(filtered);
  };

  const handleStudentApproval = async (enrollmentId, action, reason = '') => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      if (action === 'approve') {
        await axios.post(`${API}/manager/enrollments/${enrollmentId}/accept`, {}, { headers });
        alert('Student enrollment approved successfully!');
      } else if (action === 'reject') {
        const formData = new FormData();
        formData.append('reason', reason);
        await axios.post(`${API}/manager/enrollments/${enrollmentId}/reject`, formData, { headers });
        alert('Student enrollment rejected.');
      }
      
      // Refresh data
      await fetchManagerData();
    } catch (error) {
      console.error('Error handling student approval:', error);
      alert('Failed to process student approval: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Simplified wrapper functions for enrollment actions
  const handleAcceptEnrollment = async (enrollmentId) => {
    await handleStudentApproval(enrollmentId, 'approve');
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      await handleStudentApproval(enrollmentId, 'reject', reason);
    }
  };

  const handleBulkStudentAction = async () => {
    if (selectedStudents.length === 0 || !bulkAction) return;
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.student_id === studentId);
        if (student && bulkAction === 'approve' && student.enrollment_status === 'pending_approval') {
          await axios.post(`${API}/manager/enrollments/${student.id}/accept`, {}, { headers });
        }
      }
      
      alert(`Bulk action completed for ${selectedStudents.length} students`);
      setSelectedStudents([]);
      setBulkAction('');
      await fetchManagerData();
    } catch (error) {
      console.error('Error in bulk action:', error);
      alert('Failed to complete bulk action');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (studentId, teacherId) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Find the student's enrollment to assign teacher
      const selectedStudentData = students.find(s => s.student_id === studentId);
      if (!selectedStudentData) {
        alert('Student not found');
        return;
      }

      // Get the enrollment ID from the student data (enrollment object)
      const enrollmentId = selectedStudentData.id; // Use 'id' which is the enrollment ID
      if (!enrollmentId) {
        alert('Student enrollment not found');
        return;
      }

      // Call the new enrollment-based teacher assignment API
      const response = await axios.post(
        `${API}/manager/enrollments/${enrollmentId}/assign-teacher`,
        new URLSearchParams({ teacher_id: teacherId }),
        { 
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data) {
        alert(`Teacher ${response.data.teacher_name} assigned successfully to all courses for this student!`);
        await fetchManagerData(); // Refresh data
      }
      
      setShowAssignTeacherModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error assigning teacher:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to assign teacher';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignTeacher = async (courseId) => {
    if (!window.confirm('Are you sure you want to unassign the teacher from this course?')) {
      return;
    }

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Call the backend unassignment API
      await axios.delete(
        `${API}/manager/courses/${courseId}/unassign-teacher`,
        { headers }
      );

      alert('Teacher unassigned successfully!');
      await fetchManagerData(); // Refresh data
    } catch (error) {
      console.error('Error unassigning teacher:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to unassign teacher';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentNotes = async (studentId, notes) => {
    try {
      setStudentNotes(prev => ({
        ...prev,
        [studentId]: notes
      }));
      
      // Note: This would require a backend endpoint for storing notes
      alert('Student notes saved locally');
      setShowNotesModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error saving student notes:', error);
      alert('Failed to save notes');
    }
  };

  const exportStudentData = () => {
    const csvData = filteredStudents.map(student => ({
      Name: student.student_name || 'N/A',
      Email: student.student_email || 'N/A',
      Phone: student.student_phone || 'N/A',
      Status: student.enrollment_status || 'N/A',
      'Enrollment Date': new Date(student.created_at).toLocaleDateString(),
      'Theory Progress': studentProgress[student.student_id]?.course_progress?.theory || 0,
      'Park Progress': studentProgress[student.student_id]?.course_progress?.park || 0,
      'Road Progress': studentProgress[student.student_id]?.course_progress?.road || 0
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Teacher Management Functions
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${API}/teachers/add`, teacherForm, { headers });
      
      // Reset form and refresh data
      setTeacherForm({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        date_of_birth: '',
        gender: 'male',
        password: '',
        can_teach_male: true,
        can_teach_female: true
      });
      setShowTeacherModal(false);
      await fetchManagerData();
      alert('Teacher added successfully!');
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Failed to add teacher: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeacher = async (teacherId) => {
    if (!confirm('Are you sure you want to remove this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`${API}/teachers/${teacherId}`, { headers });
      
      // Refresh data
      await fetchManagerData();
      alert('Teacher removed successfully!');
    } catch (error) {
      console.error('Error removing teacher:', error);
      alert('Failed to remove teacher: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // School Info Management Functions
  const handleUpdateSchoolInfo = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`${API}/schools/my`, schoolEditForm, { headers });
      
      setShowSchoolEditModal(false);
      await fetchManagerData();
      alert('School information updated successfully!');
    } catch (error) {
      console.error('Error updating school info:', error);
      alert('Failed to update school info: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Schedule Management Functions
  const handleScheduleSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Create FormData for the new API endpoint
      const formData = new FormData();
      formData.append('teacher_id', scheduleForm.teacher_id);
      formData.append('student_id', scheduleForm.student_id);
      formData.append('course_id', scheduleForm.course_id);
      formData.append('session_type', scheduleForm.session_type);
      formData.append('scheduled_at', new Date(scheduleForm.scheduled_at).toISOString());
      formData.append('duration_minutes', scheduleForm.duration_minutes.toString());
      formData.append('location', scheduleForm.location || '');
      
      // Use the new enhanced API endpoint
      await axios.post(`${API}/manager/create-schedule`, formData, { 
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setScheduleForm({
        teacher_id: '',
        student_id: '',
        course_id: '',
        session_type: 'theory',
        scheduled_at: '',
        duration_minutes: 60,
        location: ''
      });
      setShowScheduleModal(false);
      await fetchManagerData();
      alert('Session scheduled successfully! Both teacher and student have been notified.');
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Get approved students for scheduling
  const getApprovedStudents = () => {
    return enrollments.filter(enrollment => enrollment.enrollment_status === 'approved');
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending_approval':
        return 'bg-warning text-dark';
      case 'approved':
        return 'bg-success text-white';
      case 'rejected':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  if (loading && !schoolData) {
    return (
      <div className="manager-dashboard-loading text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Dashboard</h4>
        <p>{error}</p>
        <button onClick={fetchManagerData} className="btn btn-outline-danger">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-manager-dashboard pt-5 mt-5">
      <div className="container-fluid">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-2">
                🏫 Enhanced Manager Dashboard
              </h1>
              <p className="lead text-muted">
                {schoolData?.name || 'Driving School'} - Complete Management Solution
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <div className="dashboard-stats">
                <div className="stat-item">
                  <div className="stat-number display-6 fw-bold text-primary">
                    {enrollments.length}
                  </div>
                  <div className="stat-label text-muted">Total Students</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-nav mb-4">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-tachometer-alt me-2"></i>Overview
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                <i className="fas fa-users me-2"></i>Students
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => setActiveTab('teachers')}
              >
                <i className="fas fa-chalkboard-teacher me-2"></i>Teachers
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'assignments' ? 'active' : ''}`}
                onClick={() => setActiveTab('assignments')}
              >
                <i className="fas fa-user-cog me-2"></i>Assignments
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                <i className="fas fa-calendar-alt me-2"></i>Schedule
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'school' ? 'active' : ''}`}
                onClick={() => setActiveTab('school')}
              >
                <i className="fas fa-school me-2"></i>School Info
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <i className="fas fa-chart-line me-2"></i>Analytics
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="row g-4">
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="icon-circle bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                      <i className="fas fa-users fa-2x"></i>
                    </div>
                    <h3 className="fw-bold">{enrollments.length}</h3>
                    <p className="text-muted mb-0">Total Students</p>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="icon-circle bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                      <i className="fas fa-check-circle fa-2x"></i>
                    </div>
                    <h3 className="fw-bold">
                      {enrollments.filter(e => e.enrollment_status === 'approved').length}
                    </h3>
                    <p className="text-muted mb-0">Approved Students</p>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="icon-circle bg-info bg-opacity-10 text-info rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                      <i className="fas fa-chalkboard-teacher fa-2x"></i>
                    </div>
                    <h3 className="fw-bold">{teachers.length}</h3>
                    <p className="text-muted mb-0">Teachers</p>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="icon-circle bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                      <i className="fas fa-clock fa-2x"></i>
                    </div>
                    <h3 className="fw-bold">
                      {enrollments.filter(e => e.enrollment_status === 'pending_approval').length}
                    </h3>
                    <p className="text-muted mb-0">Pending Approval</p>
                  </div>
                </div>
              </div>

              {/* Recent Students */}
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">Recent Student Enrollments</h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Assigned Teacher</th>
                            <th>Enrolled Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrollments.slice(0, 5).map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                    {enrollment.student_name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <div className="fw-bold">{enrollment.student_name}</div>
                                    <div className="small text-muted">{enrollment.student_gender === 'female' ? '♀' : '♂'} {enrollment.student_gender}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{enrollment.student_email}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(enrollment.enrollment_status)}`}>
                                  {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td>
                                {enrollment.assigned_teacher ? (
                                  <div className="d-flex align-items-center">
                                    <div className="avatar bg-success text-white rounded-circle me-2 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', fontSize: '0.8rem'}}>
                                      {enrollment.assigned_teacher.name?.charAt(0) || 'T'}
                                    </div>
                                    <div>
                                      <div className="fw-bold small">{enrollment.assigned_teacher.name}</div>
                                      <div className="small text-muted">{enrollment.assigned_teacher.gender === 'female' ? '♀' : '♂'}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted small">
                                    <i className="fas fa-user-slash me-1"></i>
                                    Not assigned
                                  </span>
                                )}
                              </td>
                              <td>{new Date(enrollment.created_at).toLocaleDateString()}</td>
                              <td>
                                <div className="btn-group" role="group">
                                  {enrollment.enrollment_status === 'pending_approval' && (
                                    <>
                                      <button
                                        onClick={() => handleAcceptEnrollment(enrollment.id)}
                                        className="btn btn-success btn-sm"
                                        title="Accept Enrollment"
                                      >
                                        <i className="fas fa-check"></i>
                                      </button>
                                      <button
                                        onClick={() => handleRejectEnrollment(enrollment.id)}
                                        className="btn btn-danger btn-sm"
                                        title="Reject Enrollment"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </>
                                  )}
                                  {enrollment.enrollment_status === 'approved' && !enrollment.assigned_teacher && (
                                    <button
                                      onClick={() => {
                                        setSelectedStudent({
                                          student_id: enrollment.student_id,
                                          enrollment_id: enrollment.id,
                                          student_name: enrollment.student_name,
                                          student_gender: enrollment.student_gender
                                        });
                                        setShowAssignTeacherModal(true);
                                      }}
                                      className="btn btn-primary btn-sm"
                                      title="Assign Teacher"
                                    >
                                      <i className="fas fa-user-plus"></i> Assign Teacher
                                    </button>
                                  )}
                                  {enrollment.assigned_teacher && (
                                    <button
                                      onClick={() => {
                                        setSelectedStudent({
                                          student_id: enrollment.student_id,
                                          enrollment_id: enrollment.id,
                                          student_name: enrollment.student_name,
                                          student_gender: enrollment.student_gender,
                                          assigned_teacher: enrollment.assigned_teacher
                                        });
                                        setShowAssignTeacherModal(true);
                                      }}
                                      className="btn btn-outline-secondary btn-sm"
                                      title="Change Teacher"
                                    >
                                      <i className="fas fa-user-edit"></i> Change
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab - Comprehensive Student Management */}
          {activeTab === 'students' && (
            <div className="row g-4">
              {/* Student Filters and Search */}
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <div className="row align-items-center">
                      <div className="col-lg-6">
                        <h5 className="card-title mb-0">
                          <i className="fas fa-users me-2"></i>Student Management
                        </h5>
                      </div>
                      <div className="col-lg-6 text-lg-end">
                        <div className="btn-group" role="group">
                          <button 
                            onClick={exportStudentData}
                            className="btn btn-outline-success btn-sm"
                            disabled={filteredStudents.length === 0}
                          >
                            <i className="fas fa-download me-1"></i>Export
                          </button>
                          {selectedStudents.length > 0 && (
                            <div className="btn-group" role="group">
                              <select 
                                className="form-select form-select-sm me-2"
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                                style={{width: 'auto'}}
                              >
                                <option value="">Bulk Actions</option>
                                <option value="approve">Approve Selected</option>
                                <option value="assign_teacher">Assign Teacher</option>
                              </select>
                              <button 
                                onClick={handleBulkStudentAction}
                                className="btn btn-primary btn-sm"
                                disabled={!bulkAction}
                              >
                                Apply ({selectedStudents.length})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    {/* Search and Filter Controls */}
                    <div className="row g-3 mb-4">
                      <div className="col-lg-4">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="fas fa-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search students by name or email..."
                            value={studentFilters.search}
                            onChange={(e) => setStudentFilters(prev => ({...prev, search: e.target.value}))}
                          />
                        </div>
                      </div>
                      
                      <div className="col-lg-2">
                        <select
                          className="form-select"
                          value={studentFilters.status}
                          onChange={(e) => setStudentFilters(prev => ({...prev, status: e.target.value}))}
                        >
                          <option value="all">All Status</option>
                          <option value="pending_approval">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      
                      <div className="col-lg-2">
                        <select
                          className="form-select"
                          value={studentFilters.course_progress}
                          onChange={(e) => setStudentFilters(prev => ({...prev, course_progress: e.target.value}))}
                        >
                          <option value="all">All Progress</option>
                          <option value="theory">Theory Started</option>
                          <option value="park">Park Started</option>
                          <option value="road">Road Started</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      
                      <div className="col-lg-2">
                        <select
                          className="form-select"
                          value={studentFilters.gender}
                          onChange={(e) => setStudentFilters(prev => ({...prev, gender: e.target.value}))}
                        >
                          <option value="all">All Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      
                      <div className="col-lg-2">
                        <button 
                          onClick={() => setStudentFilters({search: '', status: 'all', course_progress: 'all', gender: 'all'})}
                          className="btn btn-outline-secondary w-100"
                        >
                          <i className="fas fa-times me-1"></i>Clear
                        </button>
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudents(filteredStudents.map(s => s.student_id));
                                  } else {
                                    setSelectedStudents([]);
                                  }
                                }}
                              />
                            </th>
                            <th>Student</th>
                            <th>Contact</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Enrolled</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const progress = studentProgress[student.student_id] || {};
                            return (
                              <tr key={student.student_id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(student.student_id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudents(prev => [...prev, student.student_id]);
                                      } else {
                                        setSelectedStudents(prev => prev.filter(id => id !== student.student_id));
                                      }
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                      {student.student_name?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                      <div className="fw-bold">{student.student_name || 'Unknown'}</div>
                                      <small className="text-muted">ID: {student.student_id}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div>{student.student_email}</div>
                                    <small className="text-muted">{student.student_phone || 'No phone'}</small>
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(student.enrollment_status)}`}>
                                    {student.enrollment_status?.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {student.documents_verified && (
                                    <div><small className="text-success"><i className="fas fa-check-circle me-1"></i>Docs Verified</small></div>
                                  )}
                                </td>
                                <td>
                                  <div className="progress-indicators">
                                    <div className="d-flex gap-1 mb-1">
                                      <div className="progress flex-fill" style={{height: '6px'}}>
                                        <div 
                                          className="progress-bar bg-info" 
                                          style={{width: `${progress.course_progress?.theory || 0}%`}}
                                          title="Theory Progress"
                                        ></div>
                                      </div>
                                      <div className="progress flex-fill" style={{height: '6px'}}>
                                        <div 
                                          className="progress-bar bg-success" 
                                          style={{width: `${progress.course_progress?.park || 0}%`}}
                                          title="Park Progress"
                                        ></div>
                                      </div>
                                      <div className="progress flex-fill" style={{height: '6px'}}>
                                        <div 
                                          className="progress-bar bg-warning" 
                                          style={{width: `${progress.course_progress?.road || 0}%`}}
                                          title="Road Progress"
                                        ></div>
                                      </div>
                                    </div>
                                    <small className="text-muted">
                                      T: {Math.round(progress.course_progress?.theory || 0)}% | 
                                      P: {Math.round(progress.course_progress?.park || 0)}% | 
                                      R: {Math.round(progress.course_progress?.road || 0)}%
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  <small>{new Date(student.created_at).toLocaleDateString()}</small>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setShowStudentDetailsModal(true);
                                      }}
                                      className="btn btn-outline-info btn-sm"
                                      title="View Details"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    
                                    {student.enrollment_status === 'pending_approval' && (
                                      <>
                                        <button
                                          onClick={() => handleStudentApproval(student.id, 'approve')}
                                          className="btn btn-outline-success btn-sm"
                                          title="Approve"
                                        >
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const reason = prompt('Enter rejection reason:');
                                            if (reason) handleStudentApproval(student.id, 'reject', reason);
                                          }}
                                          className="btn btn-outline-danger btn-sm"
                                          title="Reject"
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </>
                                    )}
                                    
                                    {student.enrollment_status === 'approved' && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setSelectedStudent(student);
                                            setShowAssignTeacherModal(true);
                                          }}
                                          className="btn btn-outline-primary btn-sm"
                                          title="Assign Teacher"
                                        >
                                          <i className="fas fa-user-plus"></i>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedStudent(student);
                                            setShowNotesModal(true);
                                          }}
                                          className="btn btn-outline-secondary btn-sm"
                                          title="Notes"
                                        >
                                          <i className="fas fa-sticky-note"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {filteredStudents.length === 0 && (
                      <div className="text-center py-5">
                        <i className="fas fa-users fa-4x text-muted mb-4"></i>
                        <h5 className="fw-bold mb-3">No Students Found</h5>
                        <p className="text-muted">
                          {studentFilters.search || studentFilters.status !== 'all' || studentFilters.course_progress !== 'all' 
                            ? 'Try adjusting your search filters to see more students.'
                            : 'No students have enrolled in your driving school yet.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Teacher Management</h5>
                <button
                  onClick={() => setShowTeacherModal(true)}
                  className="btn btn-primary"
                >
                  <i className="fas fa-user-plus me-2"></i>Add Teacher
                </button>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="col-md-6 col-lg-4">
                      <div className="card h-100 border">
                        <div className="card-body text-center">
                          <div className="avatar bg-info text-white rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                            {teacher.user_details?.first_name?.charAt(0) || 'T'}
                          </div>
                          <h6 className="card-title">{teacher.user_details ? `${teacher.user_details.first_name} ${teacher.user_details.last_name}` : 'Unknown Teacher'}</h6>
                          <p className="text-muted small mb-2">{teacher.user_details?.email || 'No email'}</p>
                          
                          <div className="mb-3">
                            <div className="d-flex justify-content-center gap-2 mb-2">
                              {teacher.can_teach_male && (
                                <span className="badge bg-primary">♂ Male Students</span>
                              )}
                              {teacher.can_teach_female && (
                                <span className="badge bg-pink text-white" style={{ backgroundColor: '#e91e63' }}>♀ Female Students</span>
                              )}
                            </div>
                            
                            <div className="text-muted small">
                              <i className="fas fa-star text-warning me-1"></i>
                              {teacher.rating || 0}/5 ({teacher.total_reviews || 0} reviews)
                            </div>
                          </div>
                          
                          <div className="d-grid gap-2">
                            <button className="btn btn-outline-primary btn-sm">
                              <i className="fas fa-eye me-2"></i>View Profile
                            </button>
                            <button
                              onClick={() => handleRemoveTeacher(teacher.id)}
                              className="btn btn-outline-danger btn-sm"
                              disabled={loading}
                            >
                              <i className="fas fa-trash me-2"></i>Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {teachers.length === 0 && (
                    <div className="col-12">
                      <div className="text-center py-5">
                        <i className="fas fa-chalkboard-teacher fa-4x text-muted mb-4"></i>
                        <h5>No Teachers Added</h5>
                        <p className="text-muted">Start by adding teachers to your driving school</p>
                        <button
                          onClick={() => setShowTeacherModal(true)}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-user-plus me-2"></i>Add First Teacher
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-user-cog me-2"></i>Teacher-Course Assignments
                    </h5>
                    <p className="text-muted small mb-0">Assign teachers to student courses</p>
                  </div>
                  <div className="card-body">
                    {getApprovedStudents().length > 0 && teachers.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Student</th>
                              <th>Course Type</th>
                              <th>Course Status</th>
                              <th>Current Teacher</th>
                              <th>Available Teachers</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getApprovedStudents().map((student) =>
                              student.courses?.map((course) => (
                                <tr key={`${student.student_id}-${course.id}`}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                        {student.first_name?.charAt(0) || 'S'}
                                      </div>
                                      <div>
                                        <div className="fw-bold">{student.first_name} {student.last_name}</div>
                                        <div className="small text-muted">{student.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      course.course_type === 'theory' ? 'bg-info' :
                                      course.course_type === 'park' ? 'bg-warning' : 'bg-success'
                                    }`}>
                                      {course.course_type?.toUpperCase()}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      course.status === 'available' ? 'bg-success' :
                                      course.status === 'in_progress' ? 'bg-warning' :
                                      course.status === 'completed' ? 'bg-primary' : 'bg-secondary'
                                    }`}>
                                      {course.status?.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <div className="d-flex align-items-center">
                                        <span className="badge bg-success me-2">Assigned</span>
                                        <span className="small">{course.teacher_name || 'Teacher'}</span>
                                      </div>
                                    ) : (
                                      <span className="badge bg-warning">Not Assigned</span>
                                    )}
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <span className="text-muted small">Already assigned</span>
                                    ) : (
                                      <div className="d-flex align-items-center">
                                        <select 
                                          className="form-select form-select-sm me-2" 
                                          style={{ width: 'auto', minWidth: '150px' }}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              handleAssignTeacher(student.student_id, e.target.value);
                                              e.target.value = '';
                                            }
                                          }}
                                        >
                                          <option value="">Select Teacher</option>
                                          {teachers.filter(teacher => {
                                            // Filter teachers based on gender preferences
                                            if (student.gender === 'female') {
                                              return teacher.can_teach_female;
                                            } else if (student.gender === 'male') {
                                              return teacher.can_teach_male;
                                            }
                                            return true; // If gender is unknown, show all teachers
                                          }).map(teacher => (
                                            <option key={teacher.user_id} value={teacher.user_id}>
                                              {teacher.first_name} {teacher.last_name}
                                              {teacher.gender && ` (${teacher.gender})`}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleUnassignTeacher(course.id)}
                                        title="Unassign teacher"
                                      >
                                        <i className="fas fa-user-times"></i>
                                      </button>
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div className="mb-4" style={{fontSize: '4rem'}}>👥</div>
                        <h5>No Assignments Available</h5>
                        <p className="text-muted mb-4">
                          {teachers.length === 0 && getApprovedStudents().length === 0 ? 
                            'You need approved students and teachers to create assignments.' :
                            teachers.length === 0 ? 'You need to add teachers first.' :
                            'You need approved students first.'
                          }
                        </p>
                        <div className="d-flex gap-2 justify-content-center">
                          {teachers.length === 0 && (
                            <button
                              onClick={() => setActiveTab('teachers')}
                              className="btn btn-primary"
                            >
                              <i className="fas fa-user-plus me-2"></i>Add Teachers
                            </button>
                          )}
                          {getApprovedStudents().length === 0 && (
                            <button
                              onClick={() => setActiveTab('students')}
                              className="btn btn-success"
                            >
                              <i className="fas fa-users me-2"></i>View Students
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Summary */}
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">Assignment Summary</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-success">
                            {getApprovedStudents().reduce((total, student) => 
                              total + (student.courses?.filter(course => course.teacher_id).length || 0), 0
                            )}
                          </div>
                          <div className="metric-label text-muted">Assigned Courses</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-warning">
                            {getApprovedStudents().reduce((total, student) => 
                              total + (student.courses?.filter(course => !course.teacher_id && course.status === 'available').length || 0), 0
                            )}
                          </div>
                          <div className="metric-label text-muted">Unassigned Courses</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-info">
                            {teachers.length}
                          </div>
                          <div className="metric-label text-muted">Available Teachers</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-primary">
                            {getApprovedStudents().length}
                          </div>
                          <div className="metric-label text-muted">Approved Students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-user-cog me-2"></i>Teacher-Course Assignments
                    </h5>
                    <p className="text-muted small mb-0">Assign teachers to student courses</p>
                  </div>
                  <div className="card-body">
                    {getApprovedStudents().length > 0 && teachers.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Student</th>
                              <th>Course Type</th>
                              <th>Course Status</th>
                              <th>Current Teacher</th>
                              <th>Available Teachers</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getApprovedStudents().map((student) =>
                              student.courses?.map((course) => (
                                <tr key={`${student.student_id}-${course.id}`}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                        {student.first_name?.charAt(0) || 'S'}
                                      </div>
                                      <div>
                                        <div className="fw-bold">{student.first_name} {student.last_name}</div>
                                        <div className="small text-muted">{student.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      course.course_type === 'theory' ? 'bg-info' :
                                      course.course_type === 'park' ? 'bg-warning' : 'bg-success'
                                    }`}>
                                      {course.course_type?.toUpperCase()}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      course.status === 'available' ? 'bg-success' :
                                      course.status === 'in_progress' ? 'bg-warning' :
                                      course.status === 'completed' ? 'bg-primary' : 'bg-secondary'
                                    }`}>
                                      {course.status?.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <div className="d-flex align-items-center">
                                        <span className="badge bg-success me-2">Assigned</span>
                                        <span className="small">{course.teacher_name || 'Teacher'}</span>
                                      </div>
                                    ) : (
                                      <span className="badge bg-warning">Not Assigned</span>
                                    )}
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <span className="text-muted small">Already assigned</span>
                                    ) : (
                                      <div className="d-flex align-items-center">
                                        <select 
                                          className="form-select form-select-sm me-2" 
                                          style={{ width: 'auto', minWidth: '150px' }}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              handleAssignTeacher(student.student_id, e.target.value);
                                              e.target.value = '';
                                            }
                                          }}
                                        >
                                          <option value="">Select Teacher</option>
                                          {teachers.filter(teacher => {
                                            // Filter teachers based on gender preferences
                                            if (student.gender === 'female') {
                                              return teacher.can_teach_female;
                                            } else if (student.gender === 'male') {
                                              return teacher.can_teach_male;
                                            }
                                            return true; // If gender is unknown, show all teachers
                                          }).map(teacher => (
                                            <option key={teacher.user_id} value={teacher.user_id}>
                                              {teacher.first_name} {teacher.last_name}
                                              {teacher.gender && ` (${teacher.gender})`}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {course.teacher_id ? (
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleUnassignTeacher(course.id)}
                                        title="Unassign teacher"
                                      >
                                        <i className="fas fa-user-times"></i>
                                      </button>
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div className="mb-4" style={{fontSize: '4rem'}}>👥</div>
                        <h5>No Assignments Available</h5>
                        <p className="text-muted mb-4">
                          {teachers.length === 0 && getApprovedStudents().length === 0 ? 
                            'You need approved students and teachers to create assignments.' :
                            teachers.length === 0 ? 'You need to add teachers first.' :
                            'You need approved students first.'
                          }
                        </p>
                        <div className="d-flex gap-2 justify-content-center">
                          {teachers.length === 0 && (
                            <button
                              onClick={() => setActiveTab('teachers')}
                              className="btn btn-primary"
                            >
                              <i className="fas fa-user-plus me-2"></i>Add Teachers
                            </button>
                          )}
                          {getApprovedStudents().length === 0 && (
                            <button
                              onClick={() => setActiveTab('students')}
                              className="btn btn-success"
                            >
                              <i className="fas fa-users me-2"></i>View Students
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Summary */}
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">Assignment Summary</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-success">
                            {getApprovedStudents().reduce((total, student) => 
                              total + (student.courses?.filter(course => course.teacher_id).length || 0), 0
                            )}
                          </div>
                          <div className="metric-label text-muted">Assigned Courses</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-warning">
                            {getApprovedStudents().reduce((total, student) => 
                              total + (student.courses?.filter(course => !course.teacher_id && course.status === 'available').length || 0), 0
                            )}
                          </div>
                          <div className="metric-label text-muted">Unassigned Courses</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-info">
                            {teachers.length}
                          </div>
                          <div className="metric-label text-muted">Available Teachers</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="metric-value h4 mb-0 text-primary">
                            {getApprovedStudents().length}
                          </div>
                          <div className="metric-label text-muted">Approved Students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Schedule Management</h5>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="btn btn-success"
                      disabled={teachers.length === 0 || getApprovedStudents().length === 0}
                    >
                      <i className="fas fa-calendar-plus me-2"></i>Schedule Session
                    </button>
                  </div>
                  <div className="card-body">
                    {teachers.length === 0 || getApprovedStudents().length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-calendar-times fa-4x text-muted mb-4"></i>
                        <h5>Cannot Schedule Sessions</h5>
                        <p className="text-muted">
                          {teachers.length === 0 && 'You need to add teachers first. '}
                          {getApprovedStudents().length === 0 && 'You need approved students to schedule sessions.'}
                        </p>
                        {teachers.length === 0 && (
                          <button
                            onClick={() => setActiveTab('teachers')}
                            className="btn btn-primary me-2"
                          >
                            Add Teachers
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="row g-4">
                        <div className="col-md-6">
                          <h6 className="fw-bold text-primary mb-3">Available Teachers</h6>
                          <div className="list-group">
                            {teachers.map((teacher) => (
                              <div key={teacher.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="fw-bold">{teacher.user_details ? `${teacher.user_details.first_name} ${teacher.user_details.last_name}` : 'Unknown Teacher'}</div>
                                  <small className="text-muted">{teacher.user_details?.email}</small>
                                </div>
                                <div>
                                  {teacher.can_teach_male && <span className="badge bg-primary me-1">♂</span>}
                                  {teacher.can_teach_female && <span className="badge bg-pink" style={{ backgroundColor: '#e91e63' }}>♀</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="col-md-6">
                          <h6 className="fw-bold text-primary mb-3">Approved Students</h6>
                          <div className="list-group">
                            {getApprovedStudents().map((enrollment) => (
                              <div key={enrollment.id} className="list-group-item">
                                <div className="fw-bold">{enrollment.student_name}</div>
                                <small className="text-muted">{enrollment.student_email}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* School Info Tab */}
          {activeTab === 'school' && (
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">School Information</h5>
                <button
                  onClick={() => setShowSchoolEditModal(true)}
                  className="btn btn-warning"
                >
                  <i className="fas fa-edit me-2"></i>Edit Info
                </button>
              </div>
              <div className="card-body">
                {schoolData && (
                  <div className="row g-4">
                    <div className="col-md-8">
                      <h4 className="fw-bold mb-3">{schoolData.name}</h4>
                      <div className="school-details">
                        <div className="detail-item mb-3">
                          <strong><i className="fas fa-map-marker-alt me-2 text-primary"></i>Address:</strong>
                          <p className="mb-0 ms-4">{schoolData.address}, {schoolData.state}</p>
                        </div>
                        <div className="detail-item mb-3">
                          <strong><i className="fas fa-phone me-2 text-primary"></i>Phone:</strong>
                          <p className="mb-0 ms-4">{schoolData.phone}</p>
                        </div>
                        <div className="detail-item mb-3">
                          <strong><i className="fas fa-envelope me-2 text-primary"></i>Email:</strong>
                          <p className="mb-0 ms-4">{schoolData.email}</p>
                        </div>
                        <div className="detail-item mb-3">
                          <strong><i className="fas fa-money-bill-wave me-2 text-primary"></i>Price:</strong>
                          <p className="mb-0 ms-4">{schoolData.price ? schoolData.price.toLocaleString() : 'N/A'} DA</p>
                        </div>
                        <div className="detail-item mb-3">
                          <strong><i className="fas fa-star me-2 text-primary"></i>Rating:</strong>
                          <p className="mb-0 ms-4">{schoolData.rating || 0}/5 ({schoolData.total_reviews || 0} reviews)</p>
                        </div>
                        <div className="detail-item">
                          <strong><i className="fas fa-info-circle me-2 text-primary"></i>Description:</strong>
                          <p className="mb-0 ms-4">{schoolData.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        {schoolData.logo_url ? (
                          <img 
                            src={schoolData.logo_url} 
                            alt="School Logo" 
                            className="img-fluid rounded mb-3"
                            style={{ maxHeight: '200px' }}
                          />
                        ) : (
                          <div className="logo-placeholder bg-light p-5 rounded mb-3">
                            <i className="fas fa-school fa-4x text-muted"></i>
                            <p className="text-muted mt-3 mb-0">No logo uploaded</p>
                          </div>
                        )}
                        
                        {schoolData.photos && schoolData.photos.length > 0 && (
                          <div className="school-photos">
                            <h6 className="fw-bold mb-3">School Photos</h6>
                            <div className="row g-2">
                              {schoolData.photos.slice(0, 4).map((photo, index) => (
                                <div key={index} className="col-6">
                                  <img 
                                    src={photo} 
                                    alt={`School photo ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{ height: '80px', objectFit: 'cover', width: '100%' }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="card-title mb-0">School Performance</h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="metric text-center">
                          <div className="metric-value h4 mb-0 text-primary">{analytics?.total_students || enrollments.length}</div>
                          <div className="metric-label text-muted">Total Students</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="metric text-center">
                          <div className="metric-value h4 mb-0 text-success">{analytics?.completion_rate || 0}%</div>
                          <div className="metric-label text-muted">Completion Rate</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="metric text-center">
                          <div className="metric-value h4 mb-0 text-warning">{analytics?.average_rating || schoolData?.rating || 0}</div>
                          <div className="metric-label text-muted">Avg Rating</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="metric text-center">
                          <div className="metric-value h4 mb-0 text-info">{teachers.length}</div>
                          <div className="metric-label text-muted">Teachers</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="card-title mb-0">Enrollment Statistics</h6>
                  </div>
                  <div className="card-body">
                    <div className="enrollment-stats">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <div className="fw-bold">Approved</div>
                          <div className="small text-muted">{enrollments.filter(e => e.enrollment_status === 'approved').length} students</div>
                        </div>
                        <div className="text-end">
                          <div className="h6 mb-0 text-success">{enrollments.length > 0 ? Math.round((enrollments.filter(e => e.enrollment_status === 'approved').length / enrollments.length) * 100) : 0}%</div>
                          <div className="progress" style={{ width: '60px', height: '4px' }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${enrollments.length > 0 ? (enrollments.filter(e => e.enrollment_status === 'approved').length / enrollments.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <div className="fw-bold">Pending</div>
                          <div className="small text-muted">{enrollments.filter(e => e.enrollment_status === 'pending_approval').length} students</div>
                        </div>
                        <div className="text-end">
                          <div className="h6 mb-0 text-warning">{enrollments.length > 0 ? Math.round((enrollments.filter(e => e.enrollment_status === 'pending_approval').length / enrollments.length) * 100) : 0}%</div>
                          <div className="progress" style={{ width: '60px', height: '4px' }}>
                            <div
                              className="progress-bar bg-warning"
                              style={{ width: `${enrollments.length > 0 ? (enrollments.filter(e => e.enrollment_status === 'pending_approval').length / enrollments.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">Rejected</div>
                          <div className="small text-muted">{enrollments.filter(e => e.enrollment_status === 'rejected').length} students</div>
                        </div>
                        <div className="text-end">
                          <div className="h6 mb-0 text-danger">{enrollments.length > 0 ? Math.round((enrollments.filter(e => e.enrollment_status === 'rejected').length / enrollments.length) * 100) : 0}%</div>
                          <div className="progress" style={{ width: '60px', height: '4px' }}>
                            <div
                              className="progress-bar bg-danger"
                              style={{ width: `${enrollments.length > 0 ? (enrollments.filter(e => e.enrollment_status === 'rejected').length / enrollments.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentDetailsModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user me-2"></i>Student Details - {selectedStudent.student_name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  {/* Student Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Personal Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Name:</strong> {selectedStudent.student_name || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Email:</strong> {selectedStudent.student_email || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Phone:</strong> {selectedStudent.student_phone || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Status:</strong> 
                          <span className={`badge ms-2 ${getStatusBadgeClass(selectedStudent.enrollment_status)}`}>
                            {selectedStudent.enrollment_status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="mb-3">
                          <strong>Enrolled:</strong> {new Date(selectedStudent.created_at).toLocaleDateString()}
                        </div>
                        <div className="mb-0">
                          <strong>Documents:</strong> 
                          <span className={`badge ms-2 ${selectedStudent.documents_verified ? 'bg-success' : 'bg-warning'}`}>
                            {selectedStudent.documents_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Course Progress</h6>
                      </div>
                      <div className="card-body">
                        {(() => {
                          const progress = studentProgress[selectedStudent.student_id] || {};
                          return (
                            <div>
                              {/* Theory Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-book text-info me-1"></i>Theory</span>
                                  <span>{Math.round(progress.course_progress?.theory || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-info" 
                                    style={{width: `${progress.course_progress?.theory || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Park Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-car text-success me-1"></i>Park Practice</span>
                                  <span>{Math.round(progress.course_progress?.park || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-success" 
                                    style={{width: `${progress.course_progress?.park || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Road Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-road text-warning me-1"></i>Road Practice</span>
                                  <span>{Math.round(progress.course_progress?.road || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-warning" 
                                    style={{width: `${progress.course_progress?.road || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Statistics */}
                              <div className="row g-3 mt-3">
                                <div className="col-6">
                                  <div className="text-center">
                                    <div className="h5 mb-0 text-primary">{progress.total_sessions_attended || 0}</div>
                                    <small className="text-muted">Sessions</small>
                                  </div>
                                </div>
                                <div className="col-6">
                                  <div className="text-center">
                                    <div className="h5 mb-0 text-success">{Math.round(progress.average_quiz_score || 0)}%</div>
                                    <small className="text-muted">Avg Quiz Score</small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Manager Notes</h6>
                      </div>
                      <div className="card-body">
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Add notes about this student..."
                          value={studentNotes[selectedStudent.student_id] || ''}
                          onChange={(e) => setStudentNotes(prev => ({
                            ...prev,
                            [selectedStudent.student_id]: e.target.value
                          }))}
                        ></textarea>
                        <button
                          className="btn btn-primary btn-sm mt-2"
                          onClick={() => handleStudentNotes(selectedStudent.student_id, studentNotes[selectedStudent.student_id] || '')}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Close
                </button>
                {selectedStudent.enrollment_status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => {
                        handleStudentApproval(selectedStudent.id, 'approve');
                        setShowStudentDetailsModal(false);
                      }}
                      className="btn btn-success"
                    >
                      <i className="fas fa-check me-1"></i>Approve Student
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleStudentApproval(selectedStudent.id, 'reject', reason);
                          setShowStudentDetailsModal(false);
                        }
                      }}
                      className="btn btn-danger"
                    >
                      <i className="fas fa-times me-1"></i>Reject Student
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacherModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>Assign Teacher
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAssignTeacherModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Student:</label>
                  <p className="form-control-plaintext fw-bold">{selectedStudent.student_name}</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Available Teachers:</label>
                  <div className="list-group">
                    {teachers.filter(teacher => {
                      // Filter teachers based on gender preferences
                      const studentGender = selectedStudent.student_gender;
                      if (studentGender === 'female') {
                        return teacher.can_teach_female;
                      } else if (studentGender === 'male') {
                        return teacher.can_teach_male || teacher.can_teach_female;
                      }
                      return true; // If gender is unknown, show all teachers
                    }).map((teacher) => (
                      <button
                        key={teacher.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => handleAssignTeacher(selectedStudent.student_id, teacher.id)}
                      >
                        <div>
                          <div className="fw-bold">
                            {teacher.user_details ? `${teacher.user_details.first_name} ${teacher.user_details.last_name}` : 'Unknown Teacher'}
                          </div>
                          <small className="text-muted">{teacher.user_details?.email}</small>
                        </div>
                        <div>
                          {teacher.can_teach_male && <span className="badge bg-primary me-1">♂</span>}
                          {teacher.can_teach_female && <span className="badge bg-pink" style={{ backgroundColor: '#e91e63' }}>♀</span>}
                          <div className="text-muted small">
                            <i className="fas fa-star text-warning me-1"></i>
                            {teacher.rating || 0}/5
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {teachers.length === 0 && (
                    <div className="text-center py-3">
                      <i className="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                      <p className="text-muted">No teachers available. Please add teachers first.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAssignTeacherModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Notes Modal */}
      {showNotesModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-sticky-note me-2"></i>Student Notes
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Student:</label>
                  <p className="form-control-plaintext fw-bold">{selectedStudent.student_name}</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Notes:</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder="Add detailed notes about this student's progress, behavior, special requirements, etc..."
                    value={studentNotes[selectedStudent.student_id] || ''}
                    onChange={(e) => setStudentNotes(prev => ({
                      ...prev,
                      [selectedStudent.student_id]: e.target.value
                    }))}
                  ></textarea>
                  <div className="form-text">
                    These notes are private and only visible to managers.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleStudentNotes(selectedStudent.student_id, studentNotes[selectedStudent.student_id] || '')}
                >
                  <i className="fas fa-save me-1"></i>Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {showStudentDetailsModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user me-2"></i>Student Details - {selectedStudent.student_name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  {/* Student Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Personal Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Name:</strong> {selectedStudent.student_name || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Email:</strong> {selectedStudent.student_email || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Phone:</strong> {selectedStudent.student_phone || 'N/A'}
                        </div>
                        <div className="mb-3">
                          <strong>Status:</strong> 
                          <span className={`badge ms-2 ${getStatusBadgeClass(selectedStudent.enrollment_status)}`}>
                            {selectedStudent.enrollment_status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="mb-3">
                          <strong>Enrolled:</strong> {new Date(selectedStudent.created_at).toLocaleDateString()}
                        </div>
                        <div className="mb-0">
                          <strong>Documents:</strong> 
                          <span className={`badge ms-2 ${selectedStudent.documents_verified ? 'bg-success' : 'bg-warning'}`}>
                            {selectedStudent.documents_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Course Progress</h6>
                      </div>
                      <div className="card-body">
                        {(() => {
                          const progress = studentProgress[selectedStudent.student_id] || {};
                          return (
                            <div>
                              {/* Theory Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-book text-info me-1"></i>Theory</span>
                                  <span>{Math.round(progress.course_progress?.theory || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-info" 
                                    style={{width: `${progress.course_progress?.theory || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Park Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-car text-success me-1"></i>Park Practice</span>
                                  <span>{Math.round(progress.course_progress?.park || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-success" 
                                    style={{width: `${progress.course_progress?.park || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Road Progress */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <span><i className="fas fa-road text-warning me-1"></i>Road Practice</span>
                                  <span>{Math.round(progress.course_progress?.road || 0)}%</span>
                                </div>
                                <div className="progress">
                                  <div 
                                    className="progress-bar bg-warning" 
                                    style={{width: `${progress.course_progress?.road || 0}%`}}
                                  ></div>
                                </div>
                              </div>

                              {/* Statistics */}
                              <div className="row g-3 mt-3">
                                <div className="col-6">
                                  <div className="text-center">
                                    <div className="h5 mb-0 text-primary">{progress.total_sessions_attended || 0}</div>
                                    <small className="text-muted">Sessions</small>
                                  </div>
                                </div>
                                <div className="col-6">
                                  <div className="text-center">
                                    <div className="h5 mb-0 text-success">{Math.round(progress.average_quiz_score || 0)}%</div>
                                    <small className="text-muted">Avg Quiz Score</small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h6 className="card-title mb-0">Manager Notes</h6>
                      </div>
                      <div className="card-body">
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Add notes about this student..."
                          value={studentNotes[selectedStudent.student_id] || ''}
                          onChange={(e) => setStudentNotes(prev => ({
                            ...prev,
                            [selectedStudent.student_id]: e.target.value
                          }))}
                        ></textarea>
                        <button
                          className="btn btn-primary btn-sm mt-2"
                          onClick={() => handleStudentNotes(selectedStudent.student_id, studentNotes[selectedStudent.student_id] || '')}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Close
                </button>
                {selectedStudent.enrollment_status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => {
                        handleStudentApproval(selectedStudent.id, 'approve');
                        setShowStudentDetailsModal(false);
                      }}
                      className="btn btn-success"
                    >
                      <i className="fas fa-check me-1"></i>Approve Student
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleStudentApproval(selectedStudent.id, 'reject', reason);
                          setShowStudentDetailsModal(false);
                        }
                      }}
                      className="btn btn-danger"
                    >
                      <i className="fas fa-times me-1"></i>Reject Student
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacherModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>Assign Teacher
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAssignTeacherModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Student:</label>
                  <p className="form-control-plaintext fw-bold">{selectedStudent.student_name}</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Available Teachers:</label>
                  <div className="list-group">
                    {teachers.filter(teacher => {
                      // Filter teachers based on gender preferences
                      const studentGender = selectedStudent.student_gender;
                      if (studentGender === 'female') {
                        return teacher.can_teach_female;
                      } else if (studentGender === 'male') {
                        return teacher.can_teach_male || teacher.can_teach_female;
                      }
                      return true; // If gender is unknown, show all teachers
                    }).map((teacher) => (
                      <button
                        key={teacher.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => handleAssignTeacher(selectedStudent.student_id, teacher.id)}
                      >
                        <div>
                          <div className="fw-bold">
                            {teacher.user_details ? `${teacher.user_details.first_name} ${teacher.user_details.last_name}` : 'Unknown Teacher'}
                          </div>
                          <small className="text-muted">{teacher.user_details?.email}</small>
                        </div>
                        <div>
                          {teacher.can_teach_male && <span className="badge bg-primary me-1">♂</span>}
                          {teacher.can_teach_female && <span className="badge bg-pink" style={{ backgroundColor: '#e91e63' }}>♀</span>}
                          <div className="text-muted small">
                            <i className="fas fa-star text-warning me-1"></i>
                            {teacher.rating || 0}/5
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {teachers.length === 0 && (
                    <div className="text-center py-3">
                      <i className="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                      <p className="text-muted">No teachers available. Please add teachers first.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAssignTeacherModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Notes Modal */}
      {showNotesModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-sticky-note me-2"></i>Student Notes
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedStudent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Student:</label>
                  <p className="form-control-plaintext fw-bold">{selectedStudent.student_name}</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Notes:</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder="Add detailed notes about this student's progress, behavior, special requirements, etc..."
                    value={studentNotes[selectedStudent.student_id] || ''}
                    onChange={(e) => setStudentNotes(prev => ({
                      ...prev,
                      [selectedStudent.student_id]: e.target.value
                    }))}
                  ></textarea>
                  <div className="form-text">
                    These notes are private and only visible to managers.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedStudent(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleStudentNotes(selectedStudent.student_id, studentNotes[selectedStudent.student_id] || '')}
                >
                  <i className="fas fa-save me-1"></i>Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showTeacherModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>Add New Teacher
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTeacherModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddTeacher}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={teacherForm.email}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={teacherForm.password}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Minimum 6 characters"
                        required
                        minLength="6"
                      />
                      <div className="form-text">Teacher will use this password to login</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.first_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.last_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={teacherForm.phone}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        value={teacherForm.gender}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={teacherForm.date_of_birth}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={teacherForm.address}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, address: e.target.value }))}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Teaching Permissions</label>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={teacherForm.can_teach_male}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_male: e.target.checked }))}
                        />
                        <label className="form-check-label">Can teach male students</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={teacherForm.can_teach_female}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_female: e.target.checked }))}
                        />
                        <label className="form-check-label">Can teach female students</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowTeacherModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Info Modal */}
      {showSchoolEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>Edit School Information
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSchoolEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdateSchoolInfo}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">School Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={schoolEditForm.name}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={schoolEditForm.email}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={schoolEditForm.phone}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Price (DA) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={schoolEditForm.price}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        required
                        min="0"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address *</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={schoolEditForm.address}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, address: e.target.value }))}
                        required
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={schoolEditForm.description}
                        onChange={(e) => setSchoolEditForm(prev => ({ ...prev, description: e.target.value }))}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSchoolEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning" disabled={loading}>
                    {loading ? 'Updating...' : 'Update School Info'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-plus me-2"></i>Schedule Session
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowScheduleModal(false)}
                ></button>
              </div>
              <form onSubmit={handleScheduleSession}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Schedule sessions between assigned teacher-student pairs only. Teachers must be assigned to specific courses for students.
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Teacher-Student Pair *</label>
                      <select
                        className="form-select"
                        value={`${scheduleForm.teacher_id}-${scheduleForm.student_id}-${scheduleForm.course_id}`}
                        onChange={(e) => {
                          const [teacherId, studentId, courseId] = e.target.value.split('-');
                          setScheduleForm(prev => ({
                            ...prev,
                            teacher_id: teacherId,
                            student_id: studentId,
                            course_id: courseId
                          }));
                        }}
                        required
                      >
                        <option value="">Select a teacher-student pair</option>
                        {filteredPairs.map((pair) => (
                          <option key={`${pair.teacher_id}-${pair.student_id}-${pair.course_id}`} value={`${pair.teacher_id}-${pair.student_id}-${pair.course_id}`}>
                            {pair.teacher_name} → {pair.student_name} ({pair.course_type.toUpperCase()}) - {pair.enrollment_status}
                          </option>
                        ))}
                      </select>
                      {filteredPairs.length === 0 && (
                        <div className="form-text text-warning">
                          <i className="fas fa-exclamation-triangle me-1"></i>
                          No teacher-student pairs available. Please assign teachers to courses first.
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Session Type *</label>
                      <select
                        className="form-select"
                        value={scheduleForm.session_type}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, session_type: e.target.value }))}
                        required
                      >
                        <option value="theory">Theory</option>
                        <option value="park">Park Practice</option>
                        <option value="road">Road Practice</option>
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={scheduleForm.duration_minutes}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                        required
                        min="30"
                        max="180"
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={scheduleForm.scheduled_at}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        required
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={scheduleForm.location}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Meeting location (for park/road sessions)"
                      />
                    </div>
                    
                    {/* Show selected pair details */}
                    {scheduleForm.teacher_id && scheduleForm.student_id && (
                      <div className="col-12">
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">
                              <i className="fas fa-users me-2"></i>Selected Pair Details
                            </h6>
                            {(() => {
                              const selectedPair = filteredPairs.find(p => 
                                p.teacher_id === scheduleForm.teacher_id && 
                                p.student_id === scheduleForm.student_id &&
                                p.course_id === scheduleForm.course_id
                              );
                              if (selectedPair) {
                                return (
                                  <div className="row g-2">
                                    <div className="col-md-6">
                                      <strong>Teacher:</strong> {selectedPair.teacher_name}
                                      <br />
                                      <small className="text-muted">
                                        <i className={`fas ${selectedPair.teacher_gender === 'male' ? 'fa-mars' : 'fa-venus'} me-1`}></i>
                                        {selectedPair.teacher_gender}
                                      </small>
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Student:</strong> {selectedPair.student_name}
                                      <br />
                                      <small className="text-muted">
                                        <i className={`fas ${selectedPair.student_gender === 'male' ? 'fa-mars' : 'fa-venus'} me-1`}></i>
                                        {selectedPair.student_gender}
                                      </small>
                                    </div>
                                    <div className="col-12">
                                      <strong>Course:</strong> {selectedPair.course_type.toUpperCase()} ({selectedPair.course_status})
                                      <br />
                                      <strong>Enrollment Status:</strong> <span className={`badge ${selectedPair.enrollment_status === 'approved' ? 'bg-success' : 'bg-warning'}`}>{selectedPair.enrollment_status}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Scheduling...' : 'Schedule Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedManagerDashboard;