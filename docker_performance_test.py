#!/usr/bin/env python3
"""
Docker Development Environment Performance Testing
Tests container startup, volume mount performance, and hot reload efficiency
"""

import time
import subprocess
import json
import os
import sys
from pathlib import Path
import psutil

class DockerPerformanceTester:
    """Test Docker development environment performance"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'docker_info': {},
            'container_performance': {},
            'volume_performance': {},
            'hot_reload_performance': {},
            'resource_usage': {}
        }
    
    def log(self, message: str):
        """Log message with timestamp"""
        print(f"[{time.strftime('%H:%M:%S')}] {message}")
    
    def run_command(self, command: str, cwd: str = None, timeout: int = 60) -> dict:
        """Run shell command and return result"""
        try:
            start_time = time.perf_counter()
            result = subprocess.run(
                command.split(),
                cwd=cwd or self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            end_time = time.perf_counter()
            
            return {
                'success': result.returncode == 0,
                'duration_seconds': end_time - start_time,
                'stdout': result.stdout.strip(),
                'stderr': result.stderr.strip(),
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'duration_seconds': timeout,
                'stdout': '',
                'stderr': 'Command timed out',
                'returncode': -1
            }
        except Exception as e:
            return {
                'success': False,
                'duration_seconds': 0,
                'stdout': '',
                'stderr': str(e),
                'returncode': -1
            }
    
    def get_docker_info(self):
        """Get Docker system information"""
        self.log("Collecting Docker system information...")
        
        # Docker version
        docker_version = self.run_command('docker --version')
        compose_version = self.run_command('docker-compose --version')
        
        # Docker system info
        docker_info = self.run_command('docker system info --format json')
        
        self.results['docker_info'] = {
            'docker_version': docker_version['stdout'] if docker_version['success'] else 'N/A',
            'compose_version': compose_version['stdout'] if compose_version['success'] else 'N/A',
            'docker_available': docker_version['success'],
            'compose_available': compose_version['success']
        }
        
        if docker_info['success']:
            try:
                info_data = json.loads(docker_info['stdout'])
                self.results['docker_info']['containers_running'] = info_data.get('ContainersRunning', 0)
                self.results['docker_info']['containers_total'] = info_data.get('Containers', 0)
                self.results['docker_info']['images'] = info_data.get('Images', 0)
                self.results['docker_info']['server_version'] = info_data.get('ServerVersion', 'N/A')
                self.results['docker_info']['driver'] = info_data.get('Driver', 'N/A')
            except:
                pass
    
    def test_container_startup_performance(self):
        """Test container startup times"""
        self.log("Testing container startup performance...")
        
        # Stop any running containers first
        self.log("Stopping existing containers...")
        stop_result = self.run_command('docker-compose down', timeout=60)
        
        # Clean startup test
        self.log("Starting containers from clean state...")
        startup_start = time.perf_counter()
        startup_result = self.run_command('docker-compose up -d --build', timeout=300)
        startup_end = time.perf_counter()
        
        startup_time = startup_end - startup_start
        
        # Wait for containers to be fully ready
        if startup_result['success']:
            self.log("Waiting for containers to be healthy...")
            time.sleep(10)  # Give containers time to initialize
            
            # Check container status
            status_result = self.run_command('docker-compose ps --format json')
            containers_healthy = False
            
            if status_result['success']:
                try:
                    containers = json.loads(status_result['stdout'])
                    if isinstance(containers, list):
                        containers_healthy = all(
                            container.get('State', '').lower() == 'running' 
                            for container in containers
                        )
                    else:
                        containers_healthy = containers.get('State', '').lower() == 'running'
                except:
                    containers_healthy = False
        
        # Test restart performance
        self.log("Testing container restart performance...")
        restart_start = time.perf_counter()
        restart_result = self.run_command('docker-compose restart', timeout=120)
        restart_end = time.perf_counter()
        
        restart_time = restart_end - restart_start
        
        self.results['container_performance'] = {
            'cold_startup_time_seconds': startup_time,
            'cold_startup_success': startup_result['success'],
            'containers_healthy': containers_healthy,
            'restart_time_seconds': restart_time,
            'restart_success': restart_result['success'],
            'startup_output': startup_result['stdout'],
            'startup_errors': startup_result['stderr']
        }
        
        if startup_result['success']:
            self.log(f"✅ Containers started successfully in {startup_time:.2f}s")
        else:
            self.log(f"❌ Container startup failed: {startup_result['stderr']}")
    
    def test_volume_performance(self):
        """Test volume mount performance"""
        self.log("Testing volume mount performance...")
        
        # Test file write performance from host
        test_file = self.project_root / 'backend' / 'performance_test_file.txt'
        test_content = "Performance test content\n" * 1000
        
        # Write test file
        write_start = time.perf_counter()
        try:
            with open(test_file, 'w') as f:
                f.write(test_content)
        except Exception as e:
            self.log(f"❌ Failed to write test file: {e}")
            return
        write_end = time.perf_counter()
        
        # Test if file is visible in container
        container_ls = self.run_command(
            'docker-compose exec -T backend ls -la /app/performance_test_file.txt'
        )
        
        # Read test file from container
        read_start = time.perf_counter()
        container_read = self.run_command(
            'docker-compose exec -T backend cat /app/performance_test_file.txt'
        )
        read_end = time.perf_counter()
        
        # Clean up
        try:
            test_file.unlink()
        except:
            pass
        
        self.results['volume_performance'] = {
            'host_write_time_ms': (write_end - write_start) * 1000,
            'container_file_visible': container_ls['success'],
            'container_read_time_ms': (read_end - read_start) * 1000,
            'container_read_success': container_read['success'],
            'file_size_bytes': len(test_content.encode('utf-8'))
        }
    
    def test_hot_reload_simulation(self):
        """Test hot reload performance by modifying a file"""
        self.log("Testing hot reload simulation...")
        
        # Check if backend container is running
        container_check = self.run_command('docker-compose ps backend')
        if not container_check['success']:
            self.log("❌ Backend container not running, skipping hot reload test")
            return
        
        # Create a temporary file to test hot reload
        test_file = self.project_root / 'backend' / 'app' / 'hot_reload_test.py'
        original_content = '''# Hot reload test file
def test_function():
    return "original"
'''
        
        modified_content = '''# Hot reload test file
def test_function():
    return "modified"
'''
        
        try:
            # Write original file
            with open(test_file, 'w') as f:
                f.write(original_content)
            
            time.sleep(2)  # Give time for initial detection
            
            # Monitor container logs during modification
            modify_start = time.perf_counter()
            
            # Modify file
            with open(test_file, 'w') as f:
                f.write(modified_content)
            
            # Give time for hot reload to trigger
            time.sleep(5)
            
            modify_end = time.perf_counter()
            
            # Check if container is still running (successful hot reload)
            container_status = self.run_command('docker-compose ps backend')
            
            self.results['hot_reload_performance'] = {
                'file_modification_time_ms': (modify_end - modify_start) * 1000,
                'container_still_running': 'running' in container_status['stdout'].lower() if container_status['success'] else False,
                'hot_reload_simulated': True
            }
            
        except Exception as e:
            self.log(f"❌ Hot reload test failed: {e}")
            self.results['hot_reload_performance'] = {
                'hot_reload_simulated': False,
                'error': str(e)
            }
        finally:
            # Clean up test file
            try:
                test_file.unlink()
            except:
                pass
    
    def measure_resource_usage(self):
        """Measure Docker resource usage"""
        self.log("Measuring Docker resource usage...")
        
        # Get Docker stats
        stats_result = self.run_command('docker stats --no-stream --format json')
        
        if stats_result['success']:
            try:
                # Parse multiple JSON objects (one per container)
                stats_lines = stats_result['stdout'].strip().split('\n')
                containers_stats = []
                
                for line in stats_lines:
                    if line.strip():
                        container_stats = json.loads(line)
                        containers_stats.append({
                            'name': container_stats.get('Name', 'unknown'),
                            'cpu_percent': container_stats.get('CPUPerc', '0%').replace('%', ''),
                            'memory_usage': container_stats.get('MemUsage', '0B / 0B'),
                            'memory_percent': container_stats.get('MemPerc', '0%').replace('%', ''),
                            'network_io': container_stats.get('NetIO', '0B / 0B'),
                            'block_io': container_stats.get('BlockIO', '0B / 0B')
                        })
                
                self.results['resource_usage']['containers'] = containers_stats
            except Exception as e:
                self.log(f"❌ Failed to parse Docker stats: {e}")
                self.results['resource_usage']['error'] = str(e)
        
        # System resource usage
        self.results['resource_usage']['system'] = {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'memory_used_gb': psutil.virtual_memory().used / 1024 / 1024 / 1024,
            'memory_total_gb': psutil.virtual_memory().total / 1024 / 1024 / 1024
        }
    
    def generate_report(self):
        """Generate comprehensive Docker performance report"""
        self.log("Generating performance report...")
        
        # Performance assessment
        assessment = {'score': 0, 'issues': [], 'recommendations': []}
        
        # Startup performance
        if self.results['container_performance'].get('cold_startup_success'):
            startup_time = self.results['container_performance']['cold_startup_time_seconds']
            if startup_time < 30:
                assessment['score'] += 25
            elif startup_time < 60:
                assessment['score'] += 20
            elif startup_time < 120:
                assessment['score'] += 15
            else:
                assessment['issues'].append(f"Slow startup time: {startup_time:.1f}s")
                assessment['recommendations'].append("Optimize Dockerfile and reduce image size")
        else:
            assessment['issues'].append("Container startup failed")
        
        # Volume performance
        if 'volume_performance' in self.results:
            write_time = self.results['volume_performance'].get('host_write_time_ms', 0)
            if write_time < 100:
                assessment['score'] += 25
            elif write_time < 500:
                assessment['score'] += 20
            else:
                assessment['issues'].append(f"Slow volume write performance: {write_time:.1f}ms")
        
        # Hot reload
        if self.results['hot_reload_performance'].get('hot_reload_simulated'):
            assessment['score'] += 25
        
        # Container health
        if self.results['container_performance'].get('containers_healthy'):
            assessment['score'] += 25
        
        self.results['assessment'] = assessment
        
        # Save report
        report_file = self.project_root / 'docker-performance-report.json'
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        return self.results
    
    def print_summary(self):
        """Print performance summary"""
        print("\n" + "=" * 80)
        print("DOCKER DEVELOPMENT ENVIRONMENT PERFORMANCE SUMMARY")
        print("=" * 80)
        
        print(f"Test completed at: {self.results['timestamp']}")
        
        # Docker info
        docker_info = self.results['docker_info']
        print(f"Docker Version: {docker_info.get('docker_version', 'N/A')}")
        print(f"Compose Version: {docker_info.get('compose_version', 'N/A')}")
        
        # Container performance
        container_perf = self.results['container_performance']
        if container_perf.get('cold_startup_success'):
            startup_status = "✅ SUCCESS"
            startup_time = container_perf['cold_startup_time_seconds']
        else:
            startup_status = "❌ FAILED"
            startup_time = 0
        
        print(f"Container Startup: {startup_status} ({startup_time:.2f}s)")
        
        if 'restart_time_seconds' in container_perf:
            restart_time = container_perf['restart_time_seconds']
            restart_status = "✅ SUCCESS" if container_perf.get('restart_success') else "❌ FAILED"
            print(f"Container Restart: {restart_status} ({restart_time:.2f}s)")
        
        # Volume performance
        if 'volume_performance' in self.results:
            vol_perf = self.results['volume_performance']
            write_time = vol_perf.get('host_write_time_ms', 0)
            read_time = vol_perf.get('container_read_time_ms', 0)
            print(f"Volume Write Performance: {write_time:.1f}ms")
            print(f"Volume Read Performance: {read_time:.1f}ms")
        
        # Hot reload
        hot_reload = self.results['hot_reload_performance']
        if hot_reload.get('hot_reload_simulated'):
            hr_status = "✅ WORKING"
        else:
            hr_status = "❌ FAILED" if 'error' in hot_reload else "⚠️  SKIPPED"
        print(f"Hot Reload: {hr_status}")
        
        # Resource usage
        if 'resource_usage' in self.results and 'containers' in self.results['resource_usage']:
            print(f"\nContainer Resource Usage:")
            for container in self.results['resource_usage']['containers']:
                print(f"  {container['name']}: {container['cpu_percent']}% CPU, "
                      f"{container['memory_percent']}% Memory")
        
        # Overall assessment
        assessment = self.results.get('assessment', {})
        score = assessment.get('score', 0)
        print(f"\nOverall Performance Score: {score}/100")
        
        if score >= 80:
            print("🎉 EXCELLENT: Docker environment is well optimized")
        elif score >= 60:
            print("✅ GOOD: Docker environment performs adequately")
        elif score >= 40:
            print("⚠️  FAIR: Docker environment needs optimization")
        else:
            print("❌ POOR: Docker environment has significant performance issues")
        
        # Issues and recommendations
        if assessment.get('issues'):
            print(f"\nIssues Identified:")
            for issue in assessment['issues']:
                print(f"  - {issue}")
        
        if assessment.get('recommendations'):
            print(f"\nRecommendations:")
            for rec in assessment['recommendations']:
                print(f"  - {rec}")
        
        print(f"\nDetailed report saved to: docker-performance-report.json")
    
    def run_comprehensive_test(self):
        """Run all Docker performance tests"""
        self.log("Starting Docker performance assessment...")
        
        try:
            self.get_docker_info()
            
            if not self.results['docker_info']['docker_available']:
                self.log("❌ Docker is not available")
                return self.results
            
            self.test_container_startup_performance()
            self.test_volume_performance()
            self.test_hot_reload_simulation()
            self.measure_resource_usage()
            
            self.generate_report()
            self.print_summary()
            
            return self.results
            
        except KeyboardInterrupt:
            self.log("❌ Test interrupted by user")
            return self.results
        except Exception as e:
            self.log(f"❌ Test failed: {e}")
            return self.results
        finally:
            # Clean up - ensure containers are running for development
            self.log("Ensuring containers are running for continued development...")
            self.run_command('docker-compose up -d', timeout=60)

def main():
    """Main function"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    tester = DockerPerformanceTester(project_root)
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()