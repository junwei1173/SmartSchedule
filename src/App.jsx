/* global scheduler */
import {useState, useRef, useEffect} from 'react';
import './App.css';
import axios from "axios";
import logo from "./assets/templelogo.png";
import SemesterSelector from "./components/SemesterSelector.jsx";
import GeneratedSchedules from "./components/GeneratedSchedules.jsx";
import CourseSearch from './components/CourseSearch';
import SelectedCourses from "./components/SelectedCourses.jsx";
import NavBar from "./components/NavBar.jsx";

function App() {
    const [message, setMessage] = useState('');
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [semester, setSemester] = useState('');
    const [termCode, setTermCode] = useState('202503') // defaults to Spring 2025
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [schedule, setSchedule] = useState({});
    const schedulerContainerRef = useRef(null);
    const [restrictions, setRestrictions] = useState([]);
    const [topPost, setTopPost] = useState(null);
    const [redditLoading, setRedditLoading] = useState(true);
    const [redditError, setRedditError] = useState(false);

    // Fetch top post from r/Temple
    useEffect(() => {
        const fetchTopPost = async () => {
            try {
                setRedditLoading(true);
                const response = await axios.get('http://localhost:8000/api/reddit/top-post');
                
                if (response.data.post) {
                    setTopPost(response.data.post);
                } else {
                    setRedditError(true);
                }
            } catch (error) {
                console.error('Error fetching Reddit post:', error);
                setRedditError(true);
            } finally {
                setRedditLoading(false);
            }
        };

        fetchTopPost();
    }, []);


    const handleGeneration = async () => {
        setLoadingSchedules(true);

        try {

            // fetch full section data for each selected course
            const courseFetchPromises = selectedCourses.map(course => {
                const [subject] = course.code.split(" ");
                return axios.get("http://localhost:8000/api/subject/courses", {
                    params: {
                        subject,
                        term_code: termCode
                    }
                });
            });

            // run all subject fetches in parallel
            const courseResponses = await Promise.all(courseFetchPromises);

            // flatten results into full course data
            const fullCourses = [];

            selectedCourses.forEach((course, index) => {
                const courseList = courseResponses[index].data.courses;
                const matching = courseList.find(c => c.CRN === course.CRN); // match by section
                if (matching) {
                    fullCourses.push(matching);
                }
            });


            console.log("Course preview:", fullCourses.map(c => ({
                code: c.code,
                CRN: c.CRN,
                professor: c.professor,
                meetingTimes: c.meetingTimes
              })));
              

            // call generate API
            const response = await axios.post("http://localhost:8000/api/generate", {
                courses: fullCourses,
                restrictions: restrictions
            });

            console.log("✅ Schedules:", response.data);
            setSchedule(response.data);
        } catch (error) {
            console.error("Error generating schedules:", error);
        } finally {
            setLoadingSchedules(false);
        }
    };


    return (
        <>
            <NavBar />

            <div > 
                <h1> <br/><br/> Temple University<br/> Course Schedule Generator<br/></h1>
                
                {/* Reddit Top Post */}
                <div className="reddit-container" style={{ margin: '2rem auto', maxWidth: '600px' }}>
                    {redditLoading ? (
                        <div style={{ 
                            padding: '2rem', 
                            backgroundColor: '#ffffff', 
                            border: '3px solid #ffffff', 
                            borderRadius: '9px',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#60101d' }}>Loading top post from r/Temple...</p>
                        </div>
                    ) : redditError ? (
                        <div style={{ 
                            padding: '2rem', 
                            backgroundColor: '#ffffff', 
                            border: '3px solid #ffffff', 
                            borderRadius: '9px',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#60101d', marginBottom: '1rem' }}>
                                 Unable to load posts from r/Temple
                            </p>
                            <a 
                                href="https://www.reddit.com/r/Temple/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    padding: '0.5rem 1.5rem',
                                    backgroundColor: '#FF4500',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '25px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Visit r/Temple →
                            </a>
                        </div>
                    ) : topPost ? (
                        <div style={{ 
                            padding: '2rem', 
                            backgroundColor: '#ffffff', 
                            border: '3px solid #ffffff', 
                            borderRadius: '9px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                            <h3 style={{ 
                                color: '#60101d', 
                                marginBottom: '1rem',
                                fontSize: '1.2rem'
                            }}>
                                 Top Post from r/Temple {topPost.time_period && `(Past ${topPost.time_period === 'hour' ? 'Hour' : topPost.time_period === 'day' ? 'Day' : 'Week'})`}
                            </h3>
                            <div style={{ 
                                backgroundColor: '#f5f5f5', 
                                padding: '1.5rem', 
                                borderRadius: '8px',
                                marginBottom: '1rem'
                            }}>
                                <h4 style={{ 
                                    color: '#60101d', 
                                    marginBottom: '0.5rem',
                                    fontSize: '1.1rem'
                                }}>
                                    {topPost.title}
                                </h4>
                                {topPost.selftext && (
                                    <p style={{ 
                                        color: '#60101d', 
                                        marginBottom: '0.5rem',
                                        maxHeight: '150px',
                                        overflow: 'auto'
                                    }}>
                                        {topPost.selftext.substring(0, 300)}
                                        {topPost.selftext.length > 300 ? '...' : ''}
                                    </p>
                                )}
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '1rem', 
                                    fontSize: '0.9rem',
                                    color: '#666',
                                    marginTop: '0.75rem'
                                }}>
                                    <span>👤 u/{topPost.author}</span>
                                    <span>⬆️ {topPost.ups} upvotes</span>
                                    <span>💬 {topPost.num_comments} comments</span>
                                </div>
                            </div>
                            <a 
                                href={`https://www.reddit.com${topPost.permalink}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    padding: '0.5rem 1.5rem',
                                    backgroundColor: '#FF4500',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '25px',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem'
                                }}
                            >
                                Read More on Reddit →
                            </a>
                        </div>
                    ) : null}
                </div>
            </div>

            <div class = "center">
                <div className="container">

                    <SemesterSelector
                        semester={semester}
                        setSemester={setSemester}
                        termCode={termCode}
                        setTermCode={setTermCode}
                        setSelectedCourses={setSelectedCourses}
                        restrictions={restrictions}
                        setRestrictions={setRestrictions}
                    />

                    <CourseSearch
                        termCode={termCode}
                        selectedCourses={selectedCourses}
                        setSelectedCourses={setSelectedCourses}
                        setMessage={setMessage}
                    />

                    <SelectedCourses
                        selectedCourses={selectedCourses}
                        setSelectedCourses={setSelectedCourses}
                    />

                

                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' , justifyContent: 'center'}}>
                <button onClick={handleGeneration} disabled={loadingSchedules}>
                    {loadingSchedules ? <i>Generating...</i> : "Generate Schedules"}
                </button>

                </div>
            </div>
            

            <GeneratedSchedules schedule={schedule} schedulerContainerRef={schedulerContainerRef} isLoading={loadingSchedules}/>

        </>
    );


}

export default App;

