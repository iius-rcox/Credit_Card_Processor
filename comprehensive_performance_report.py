#!/usr/bin/env python3
"""
Comprehensive Performance Assessment Report Generator
Aggregates results from all performance tests and generates final report
"""

import json
import time
import os
from pathlib import Path
from typing import Dict, Any, List
import subprocess

class ComprehensivePerformanceReporter:
    """Generate comprehensive performance assessment report"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.report_data = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'project_info': {},
            'backend_performance': {},
            'frontend_performance': {},
            'docker_performance': {},
            'load_test_results': {},
            'overall_assessment': {},
            'recommendations': [],
            'production_readiness': {}
        }
    
    def collect_project_info(self):
        """Collect basic project information"""
        self.report_data['project_info'] = {
            'project_name': 'Credit Card Processor',
            'assessment_scope': [
                'Phase 1A: Project Initialization',
                'Phase 1B: Database & Authentication', 
                'Phase 1C: Core API Endpoints (Task 3.1)'
            ],
            'technology_stack': {
                'backend': 'FastAPI + SQLAlchemy + SQLite',
                'frontend': 'Vue 3 + Vite + Pinia + Tailwind CSS',
                'development': 'Docker Compose',
                'authentication': 'Windows Authentication',
                'database': 'SQLite with comprehensive indexing'
            },
            'project_root': str(self.project_root)
        }
    
    def load_backend_results(self):
        """Load backend performance test results"""
        backend_report = self.project_root / 'backend' / 'performance_report.json'
        if backend_report.exists():
            with open(backend_report, 'r') as f:
                self.report_data['backend_performance'] = json.load(f)
        else:
            self.report_data['backend_performance'] = {'error': 'Backend performance report not found'}
    
    def load_frontend_results(self):
        """Load frontend performance test results"""
        frontend_report = self.project_root / 'frontend' / 'frontend-performance-report.json'
        if frontend_report.exists():
            with open(frontend_report, 'r') as f:
                self.report_data['frontend_performance'] = json.load(f)
        else:
            self.report_data['frontend_performance'] = {'error': 'Frontend performance report not found'}
    
    def load_docker_results(self):
        """Load Docker performance test results"""
        docker_report = self.project_root / 'docker-performance-report.json'
        if docker_report.exists():
            with open(docker_report, 'r') as f:
                self.report_data['docker_performance'] = json.load(f)
        else:
            self.report_data['docker_performance'] = {'error': 'Docker performance report not found'}
    
    def load_load_test_results(self):
        """Load load test results if available"""
        # Look for most recent load test report
        load_test_files = list(self.project_root.glob('load_test_report_*.json'))
        if load_test_files:
            latest_report = max(load_test_files, key=os.path.getctime)
            with open(latest_report, 'r') as f:
                self.report_data['load_test_results'] = json.load(f)
        else:
            self.report_data['load_test_results'] = {'error': 'Load test results not found'}
    
    def analyze_backend_performance(self) -> Dict[str, Any]:
        """Analyze backend performance results"""
        backend_data = self.report_data['backend_performance']
        
        if 'error' in backend_data:
            return {'status': 'error', 'score': 0, 'issues': ['Backend tests not completed']}
        
        analysis = {
            'status': 'analyzed',
            'score': 0,
            'issues': [],
            'strengths': []
        }
        
        # API Performance Analysis
        api_perf = backend_data.get('api_performance', {})
        passed_endpoints = 0
        total_endpoints = 0
        
        for endpoint, stats in api_perf.items():
            if isinstance(stats, dict) and 'avg_response_time_ms' in stats:
                total_endpoints += 1
                if stats['avg_response_time_ms'] < 100:
                    passed_endpoints += 1
                    analysis['strengths'].append(f"{endpoint}: {stats['avg_response_time_ms']:.1f}ms")
                else:
                    analysis['issues'].append(f"{endpoint}: {stats['avg_response_time_ms']:.1f}ms (>100ms target)")
        
        if total_endpoints > 0:
            api_score = (passed_endpoints / total_endpoints) * 40
            analysis['score'] += api_score
        
        # Database Performance Analysis
        db_perf = backend_data.get('database_performance', {})
        passed_queries = 0
        total_queries = 0
        
        for query_name, stats in db_perf.items():
            if isinstance(stats, dict) and 'avg_response_time_ms' in stats:
                total_queries += 1
                if stats['avg_response_time_ms'] < 50:
                    passed_queries += 1
                    analysis['strengths'].append(f"{query_name}: {stats['avg_response_time_ms']:.1f}ms")
                else:
                    analysis['issues'].append(f"{query_name}: {stats['avg_response_time_ms']:.1f}ms (>50ms target)")
        
        if total_queries > 0:
            db_score = (passed_queries / total_queries) * 40
            analysis['score'] += db_score
        
        # Memory Usage Analysis
        memory_usage = backend_data.get('memory_usage', {})
        current_memory = memory_usage.get('current_memory_mb', 0)
        if current_memory < 200:
            analysis['score'] += 20
            analysis['strengths'].append(f"Efficient memory usage: {current_memory:.1f} MB")
        elif current_memory < 500:
            analysis['score'] += 10
            analysis['issues'].append(f"Moderate memory usage: {current_memory:.1f} MB")
        else:
            analysis['issues'].append(f"High memory usage: {current_memory:.1f} MB")
        
        return analysis
    
    def analyze_frontend_performance(self) -> Dict[str, Any]:
        """Analyze frontend performance results"""
        frontend_data = self.report_data['frontend_performance']
        
        if 'error' in frontend_data:
            return {'status': 'error', 'score': 0, 'issues': ['Frontend tests not completed']}
        
        analysis = {
            'status': 'analyzed',
            'score': 0,
            'issues': [],
            'strengths': []
        }
        
        # Build Performance
        build_perf = frontend_data.get('buildPerformance', {})
        if build_perf.get('buildSuccess'):
            build_time = build_perf.get('buildTime_seconds', 0)
            if build_time < 10:
                analysis['score'] += 30
                analysis['strengths'].append(f"Fast build time: {build_time:.2f}s")
            elif build_time < 30:
                analysis['score'] += 20
                analysis['strengths'].append(f"Good build time: {build_time:.2f}s")
            else:
                analysis['issues'].append(f"Slow build time: {build_time:.2f}s")
        else:
            analysis['issues'].append("Build failed")
        
        # Bundle Size
        bundle_analysis = frontend_data.get('bundleAnalysis', {})
        bundle_size_mb = float(bundle_analysis.get('totalSize_mb', 0))
        if bundle_size_mb < 0.5:
            analysis['score'] += 25
            analysis['strengths'].append(f"Small bundle size: {bundle_size_mb:.2f} MB")
        elif bundle_size_mb < 1.0:
            analysis['score'] += 20
            analysis['strengths'].append(f"Good bundle size: {bundle_size_mb:.2f} MB")
        elif bundle_size_mb < 2.0:
            analysis['score'] += 10
            analysis['issues'].append(f"Large bundle size: {bundle_size_mb:.2f} MB")
        else:
            analysis['issues'].append(f"Very large bundle size: {bundle_size_mb:.2f} MB")
        
        # Dependencies
        dependencies = frontend_data.get('dependencies', {})
        total_deps = dependencies.get('totalDependencies', 0)
        if total_deps < 30:
            analysis['score'] += 15
            analysis['strengths'].append(f"Lean dependencies: {total_deps} packages")
        elif total_deps < 50:
            analysis['score'] += 10
            analysis['strengths'].append(f"Moderate dependencies: {total_deps} packages")
        else:
            analysis['issues'].append(f"Many dependencies: {total_deps} packages")
        
        # Development Server
        dev_server = frontend_data.get('developmentServer', {})
        if dev_server.get('hasHMR'):
            analysis['score'] += 10
            analysis['strengths'].append("Hot Module Replacement enabled")
        
        return analysis
    
    def analyze_docker_performance(self) -> Dict[str, Any]:
        """Analyze Docker performance results"""
        docker_data = self.report_data['docker_performance']
        
        if 'error' in docker_data:
            return {'status': 'error', 'score': 0, 'issues': ['Docker tests not completed']}
        
        analysis = {
            'status': 'analyzed', 
            'score': 0,
            'issues': [],
            'strengths': []
        }
        
        # Container Startup
        container_perf = docker_data.get('container_performance', {})
        if container_perf.get('cold_startup_success'):
            startup_time = container_perf.get('cold_startup_time_seconds', 0)
            if startup_time < 30:
                analysis['score'] += 30
                analysis['strengths'].append(f"Fast container startup: {startup_time:.1f}s")
            elif startup_time < 60:
                analysis['score'] += 20
                analysis['strengths'].append(f"Good container startup: {startup_time:.1f}s")
            else:
                analysis['issues'].append(f"Slow container startup: {startup_time:.1f}s")
        else:
            analysis['issues'].append("Container startup failed")
        
        # Volume Performance
        volume_perf = docker_data.get('volume_performance', {})
        write_time = volume_perf.get('host_write_time_ms', 0)
        if write_time < 100:
            analysis['score'] += 20
            analysis['strengths'].append(f"Fast volume write: {write_time:.1f}ms")
        elif write_time < 500:
            analysis['score'] += 10
        else:
            analysis['issues'].append(f"Slow volume write: {write_time:.1f}ms")
        
        # Hot Reload
        hot_reload = docker_data.get('hot_reload_performance', {})
        if hot_reload.get('hot_reload_simulated'):
            analysis['score'] += 25
            analysis['strengths'].append("Hot reload working")
        
        # Container Health
        if container_perf.get('containers_healthy'):
            analysis['score'] += 25
            analysis['strengths'].append("All containers healthy")
        
        return analysis
    
    def generate_overall_assessment(self):
        """Generate overall performance assessment"""
        backend_analysis = self.analyze_backend_performance()
        frontend_analysis = self.analyze_frontend_performance()
        docker_analysis = self.analyze_docker_performance()
        
        overall_score = (
            backend_analysis['score'] * 0.4 +  # 40% weight for backend
            frontend_analysis['score'] * 0.3 +  # 30% weight for frontend  
            docker_analysis['score'] * 0.3      # 30% weight for Docker
        )
        
        # Performance grade
        if overall_score >= 90:
            grade = 'A'
            status = 'EXCELLENT'
            description = 'Ready for production deployment'
        elif overall_score >= 80:
            grade = 'B'
            status = 'GOOD'
            description = 'Minor optimizations recommended'
        elif overall_score >= 70:
            grade = 'C'
            status = 'SATISFACTORY'
            description = 'Some performance improvements needed'
        elif overall_score >= 60:
            grade = 'D'
            status = 'NEEDS IMPROVEMENT'
            description = 'Significant optimization required'
        else:
            grade = 'F'
            status = 'POOR'
            description = 'Major performance issues must be addressed'
        
        self.report_data['overall_assessment'] = {
            'overall_score': overall_score,
            'grade': grade,
            'status': status,
            'description': description,
            'backend_analysis': backend_analysis,
            'frontend_analysis': frontend_analysis,
            'docker_analysis': docker_analysis
        }
    
    def generate_recommendations(self):
        """Generate optimization recommendations"""
        recommendations = []
        overall = self.report_data['overall_assessment']
        
        # Backend recommendations
        backend_issues = overall['backend_analysis'].get('issues', [])
        if any('ms' in issue for issue in backend_issues):
            recommendations.append({
                'category': 'Backend Performance',
                'priority': 'High',
                'issue': 'API response times exceed targets',
                'recommendation': 'Optimize database queries, add caching, and implement connection pooling',
                'impact': 'Improved user experience and reduced server load'
            })
        
        # Frontend recommendations
        frontend_issues = overall['frontend_analysis'].get('issues', [])
        if any('build time' in issue for issue in frontend_issues):
            recommendations.append({
                'category': 'Frontend Performance',
                'priority': 'Medium',
                'issue': 'Slow build times affecting development productivity',
                'recommendation': 'Optimize Vite configuration and reduce dependency tree',
                'impact': 'Faster development cycles and improved developer experience'
            })
        
        if any('bundle size' in issue for issue in frontend_issues):
            recommendations.append({
                'category': 'Frontend Performance',
                'priority': 'High',
                'issue': 'Large bundle size affecting load times',
                'recommendation': 'Implement code splitting, tree shaking, and lazy loading',
                'impact': 'Faster initial page loads and better mobile performance'
            })
        
        # Docker recommendations
        docker_issues = overall['docker_analysis'].get('issues', [])
        if any('startup' in issue for issue in docker_issues):
            recommendations.append({
                'category': 'Development Environment',
                'priority': 'Medium',
                'issue': 'Slow Docker container startup affecting development workflow',
                'recommendation': 'Optimize Dockerfiles, use multi-stage builds, and implement layer caching',
                'impact': 'Faster development environment setup and reduced context switching'
            })
        
        # Production readiness recommendations
        if overall['overall_score'] < 80:
            recommendations.append({
                'category': 'Production Readiness',
                'priority': 'High',
                'issue': 'Performance metrics below production standards',
                'recommendation': 'Address identified performance issues before production deployment',
                'impact': 'Ensures system stability and user satisfaction in production'
            })
        
        self.report_data['recommendations'] = recommendations
    
    def assess_production_readiness(self):
        """Assess production readiness"""
        overall_score = self.report_data['overall_assessment']['overall_score']
        
        readiness_checklist = {
            'api_response_times': False,
            'database_performance': False,
            'frontend_build_optimization': False,
            'container_deployment': False,
            'monitoring_setup': False,
            'security_implementation': False
        }
        
        # Check API response times
        backend_data = self.report_data.get('backend_performance', {})
        api_perf = backend_data.get('api_performance', {})
        api_targets_met = sum(1 for stats in api_perf.values() 
                            if isinstance(stats, dict) and stats.get('avg_response_time_ms', 1000) < 100)
        total_apis = len([s for s in api_perf.values() if isinstance(s, dict) and 'avg_response_time_ms' in s])
        
        if total_apis > 0 and api_targets_met / total_apis >= 0.8:
            readiness_checklist['api_response_times'] = True
        
        # Check database performance
        db_perf = backend_data.get('database_performance', {})
        db_targets_met = sum(1 for stats in db_perf.values()
                           if isinstance(stats, dict) and stats.get('avg_response_time_ms', 1000) < 50)
        total_queries = len(db_perf)
        
        if total_queries > 0 and db_targets_met / total_queries >= 0.8:
            readiness_checklist['database_performance'] = True
        
        # Check frontend build
        frontend_data = self.report_data.get('frontend_performance', {})
        build_success = frontend_data.get('buildPerformance', {}).get('buildSuccess', False)
        bundle_size = float(frontend_data.get('bundleAnalysis', {}).get('totalSize_mb', 10))
        
        if build_success and bundle_size < 2.0:
            readiness_checklist['frontend_build_optimization'] = True
        
        # Check Docker deployment
        docker_data = self.report_data.get('docker_performance', {})
        container_success = docker_data.get('container_performance', {}).get('cold_startup_success', False)
        containers_healthy = docker_data.get('container_performance', {}).get('containers_healthy', False)
        
        if container_success and containers_healthy:
            readiness_checklist['container_deployment'] = True
        
        # Security implementation (basic check)
        if 'windows' in str(backend_data).lower():
            readiness_checklist['security_implementation'] = True
        
        # Calculate readiness score
        readiness_score = sum(readiness_checklist.values()) / len(readiness_checklist) * 100
        
        self.report_data['production_readiness'] = {
            'readiness_score': readiness_score,
            'checklist': readiness_checklist,
            'deployment_recommendation': (
                'Ready for production deployment' if readiness_score >= 80 else
                'Requires optimization before production' if readiness_score >= 60 else
                'Not ready for production deployment'
            )
        }
    
    def generate_report(self):
        """Generate comprehensive performance report"""
        print("🚀 Generating Comprehensive Performance Assessment Report...")
        print("=" * 80)
        
        # Collect all data
        self.collect_project_info()
        self.load_backend_results() 
        self.load_frontend_results()
        self.load_docker_results()
        self.load_load_test_results()
        
        # Perform analysis
        self.generate_overall_assessment()
        self.generate_recommendations()
        self.assess_production_readiness()
        
        # Save comprehensive report
        report_file = self.project_root / 'COMPREHENSIVE_PERFORMANCE_REPORT.json'
        with open(report_file, 'w') as f:
            json.dump(self.report_data, f, indent=2, default=str)
        
        # Print summary
        self.print_executive_summary()
        
        return self.report_data
    
    def print_executive_summary(self):
        """Print executive summary of performance assessment"""
        print(f"\n📊 COMPREHENSIVE PERFORMANCE ASSESSMENT - EXECUTIVE SUMMARY")
        print("=" * 80)
        
        overall = self.report_data['overall_assessment']
        readiness = self.report_data['production_readiness']
        
        print(f"Project: {self.report_data['project_info']['project_name']}")
        print(f"Assessment Date: {self.report_data['timestamp']}")
        print(f"Overall Performance Score: {overall['overall_score']:.1f}/100 (Grade {overall['grade']})")
        print(f"Status: {overall['status']} - {overall['description']}")
        
        print(f"\n🎯 COMPONENT PERFORMANCE BREAKDOWN:")
        print(f"  Backend (FastAPI + SQLite): {overall['backend_analysis']['score']:.1f}/100")
        print(f"  Frontend (Vue 3 + Vite): {overall['frontend_analysis']['score']:.1f}/100")
        print(f"  Docker Environment: {overall['docker_analysis']['score']:.1f}/100")
        
        print(f"\n✅ KEY STRENGTHS:")
        all_strengths = (
            overall['backend_analysis'].get('strengths', []) +
            overall['frontend_analysis'].get('strengths', []) +
            overall['docker_analysis'].get('strengths', [])
        )
        for strength in all_strengths[:5]:  # Top 5 strengths
            print(f"  • {strength}")
        
        print(f"\n⚠️  AREAS FOR IMPROVEMENT:")
        all_issues = (
            overall['backend_analysis'].get('issues', []) +
            overall['frontend_analysis'].get('issues', []) +
            overall['docker_analysis'].get('issues', [])
        )
        for issue in all_issues[:5]:  # Top 5 issues
            print(f"  • {issue}")
        
        print(f"\n🚀 PRODUCTION READINESS:")
        print(f"  Readiness Score: {readiness['readiness_score']:.1f}%")
        print(f"  Recommendation: {readiness['deployment_recommendation']}")
        
        checklist = readiness['checklist']
        print(f"  Readiness Checklist:")
        for item, status in checklist.items():
            status_icon = "✅" if status else "❌"
            item_name = item.replace('_', ' ').title()
            print(f"    {status_icon} {item_name}")
        
        print(f"\n📋 HIGH-PRIORITY RECOMMENDATIONS:")
        high_priority = [r for r in self.report_data['recommendations'] if r.get('priority') == 'High']
        for i, rec in enumerate(high_priority[:3], 1):
            print(f"  {i}. {rec['issue']}")
            print(f"     → {rec['recommendation']}")
        
        print(f"\n📁 DETAILED REPORTS:")
        reports_found = []
        if 'error' not in self.report_data['backend_performance']:
            reports_found.append("✅ Backend Performance Report (backend/performance_report.json)")
        if 'error' not in self.report_data['frontend_performance']:
            reports_found.append("✅ Frontend Performance Report (frontend/frontend-performance-report.json)")
        if 'error' not in self.report_data['docker_performance']:
            reports_found.append("✅ Docker Performance Report (docker-performance-report.json)")
        
        for report in reports_found:
            print(f"  {report}")
        
        print(f"\n📊 Comprehensive report saved to: COMPREHENSIVE_PERFORMANCE_REPORT.json")
        
        # Final assessment
        if overall['overall_score'] >= 90:
            print(f"\n🎉 EXCELLENT PERFORMANCE! System is production-ready with outstanding metrics.")
        elif overall['overall_score'] >= 80:
            print(f"\n✅ GOOD PERFORMANCE! System is production-ready with minor optimizations recommended.")
        elif overall['overall_score'] >= 70:
            print(f"\n⚠️  SATISFACTORY PERFORMANCE. Address identified issues for optimal production performance.")
        else:
            print(f"\n❌ PERFORMANCE NEEDS IMPROVEMENT. Significant optimization required before production deployment.")

def main():
    """Main function to generate comprehensive performance report"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    reporter = ComprehensivePerformanceReporter(project_root)
    reporter.generate_report()

if __name__ == "__main__":
    main()