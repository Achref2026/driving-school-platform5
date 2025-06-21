import React, { useState, useEffect, useCallback } from 'react';

const OfflineQuiz = ({ quiz, onClose, token }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize quiz when component loads
  useEffect(() => {
    if (quiz) {
      startQuiz();
    }
  }, [quiz]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (quizStarted && !quizCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuizSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeLeft]);

  const startQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(quiz.time_limit_minutes * 60);
    setQuizStarted(true);
    setQuizCompleted(false);
    setScore(0);
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuizSubmit = useCallback(async () => {
    if (!quiz || quizCompleted) return;

    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        correctAnswers++;
      }
    });

    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = finalScore >= quiz.passing_score;
    
    setScore(finalScore);
    setQuizCompleted(true);
    setQuizStarted(false);

    // Submit to backend if online
    if (isOnline && token) {
      try {
        setSyncStatus('syncing');
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quizzes/${quiz.id}/attempt`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answers: answers
          })
        });

        if (response.ok) {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          setSyncStatus('error');
          // Store for later sync
          storeOfflineResult(finalScore, passed);
        }
      } catch (error) {
        console.error('Failed to submit quiz:', error);
        setSyncStatus('error');
        // Store for later sync
        storeOfflineResult(finalScore, passed);
      }
    } else {
      // Store for later sync when online
      storeOfflineResult(finalScore, passed);
    }
  }, [quiz, answers, quizCompleted, timeLeft, isOnline, token]);

  const storeOfflineResult = (finalScore, passed) => {
    const result = {
      id: Date.now().toString(),
      quiz_id: quiz.id,
      answers: answers,
      score: finalScore,
      passed: passed,
      completed_at: new Date().toISOString(),
      time_taken: (quiz.time_limit_minutes * 60) - timeLeft,
      offline: !isOnline
    };

    // Store in localStorage for sync
    const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
    storedResults.push(result);
    localStorage.setItem('offline_quiz_results', JSON.stringify(storedResults));
  };

  const syncQuizResults = async () => {
    const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
    if (storedResults.length === 0) return;

    setSyncStatus('syncing');
    
    try {
      if (!token) {
        setSyncStatus('error');
        return;
      }

      for (const result of storedResults) {
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quizzes/${result.quiz_id}/attempt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              answers: result.answers
            })
          });

          if (response.ok) {
            // Remove synced result
            const updatedResults = storedResults.filter(r => r.id !== result.id);
            localStorage.setItem('offline_quiz_results', JSON.stringify(updatedResults));
          }
        } catch (error) {
          console.error('Failed to sync individual result:', error);
        }
      }

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
      if (storedResults.length > 0) {
        syncQuizResults();
      }
    }
  }, [isOnline]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!quiz) return 0;
    return Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100);
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz?.questions.length - 1;
  const unsyncedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]').length;

  if (!quizStarted && !quizCompleted) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <div>
                <h2 className="modal-title fs-4 fw-bold">{quiz.title}</h2>
                <p className="mb-0 opacity-75">{quiz.description}</p>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body">
              <div className="d-flex flex-wrap gap-3 text-muted mb-4">
                <span>
                  <i className="bi bi-question-circle me-1"></i>
                  {quiz.questions?.length || 0} questions
                </span>
                <span>
                  <i className="bi bi-clock me-1"></i>
                  {quiz.time_limit_minutes || 30} minutes
                </span>
                <span className={`badge ${
                  quiz.difficulty === 'easy' ? 'bg-success' :
                  quiz.difficulty === 'medium' ? 'bg-warning' :
                  'bg-danger'
                }`}>
                  {quiz.difficulty || 'medium'}
                </span>
              </div>

              <div className="d-grid">
                <button
                  onClick={startQuiz}
                  className="btn btn-primary btn-lg"
                >
                  Start Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const passed = score >= quiz.passing_score;
    
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className={`modal-header text-white ${passed ? 'bg-success' : 'bg-danger'}`}>
              <div className="text-center w-100">
                <div style={{fontSize: '4rem'}} className="mb-3">{passed ? '🎉' : '😔'}</div>
                <h2 className="modal-title fs-4 fw-bold">
                  {passed ? 'Congratulations!' : 'Try Again!'}
                </h2>
                <p className="fs-5 mb-0">Score: {score}%</p>
              </div>
            </div>

            <div className="modal-body text-center">
              <p className="text-muted mb-4">
                {passed 
                  ? `You passed the quiz! You need ${quiz.passing_score}% to pass.`
                  : `You need ${quiz.passing_score}% to pass. Keep practicing!`
                }
              </p>

              {!isOnline && (
                <div className="alert alert-warning d-flex align-items-center">
                  <i className="bi bi-phone me-2"></i>
                  <small>Your result is saved offline and will sync when you're back online.</small>
                </div>
              )}

              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                <button
                  onClick={() => {
                    setQuizCompleted(false);
                    startQuiz();
                  }}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header with progress */}
          <div className="modal-header bg-primary text-white">
            <div className="w-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold">{quiz.title}</h5>
                <div className="text-end">
                  <div className="fs-5 fw-bold">{formatTime(timeLeft)}</div>
                  <div className="small opacity-75">Time Left</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress mb-2" style={{height: '8px'}}>
                <div 
                  className="progress-bar bg-light"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="small opacity-75">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="modal-body">
            <div className="mb-4">
              <h6 className="fw-semibold mb-4">
                {currentQuestion.question}
              </h6>

              <div className="d-grid gap-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`d-flex align-items-center p-3 border rounded cursor-pointer ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border-secondary'
                    }`}
                    style={{cursor: 'pointer'}}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                      className="form-check-input me-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="d-flex justify-content-between align-items-center">
              <button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn btn-outline-secondary d-flex align-items-center"
              >
                <i className="bi bi-chevron-left me-1"></i>
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleQuizSubmit}
                  className="btn btn-success fw-medium"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="btn btn-primary d-flex align-items-center"
                >
                  Next
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              )}
            </div>

            {/* Offline indicator */}
            {!isOnline && (
              <div className="alert alert-warning d-flex align-items-center mt-4">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <small>Taking quiz offline - results will sync when you reconnect</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineQuiz;